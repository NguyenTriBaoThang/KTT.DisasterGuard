using System.IO.Compression;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace KTT.DisasterGuard.Api.Services.Atcf;

public interface IAtcfService
{
    Task<GeoJsonFeatureCollection> GetCycloneGeoJsonByEventIdAsync(
        string eventId,
        string? source,
        string? aid,
        CancellationToken ct = default);

    Task<GeoJsonFeatureCollection> GetActiveGeoJsonAsync(
        IEnumerable<string>? eventIds,
        string? source,
        string? aid,
        CancellationToken ct = default);
}

public sealed class AtcfService : IAtcfService
{
    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly AtcfOptions _opt;

    public AtcfService(HttpClient http, IMemoryCache cache, IOptions<AtcfOptions> opt)
    {
        _http = http;
        _cache = cache;
        _opt = opt.Value;
    }

    public async Task<GeoJsonFeatureCollection> GetActiveGeoJsonAsync(
        IEnumerable<string>? eventIds,
        string? source,
        string? aid,
        CancellationToken ct = default)
    {
        var ids = (eventIds ?? _opt.DefaultActiveEventIds).Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToUpperInvariant()).Distinct().ToList();

        var fc = new GeoJsonFeatureCollection();
        if (ids.Count == 0) return fc;

        foreach (var id in ids)
        {
            var one = await GetCycloneGeoJsonByEventIdAsync(id, source, aid, ct);
            foreach (var f in one.Features) fc.Features.Add(f);
        }

        return fc;
    }

    public async Task<GeoJsonFeatureCollection> GetCycloneGeoJsonByEventIdAsync(
        string eventId,
        string? source,
        string? aid,
        CancellationToken ct = default)
    {
        eventId = (eventId ?? "").Trim().ToUpperInvariant();
        if (!TryParseEventId(eventId, out var basin, out var storm, out var year))
            return new GeoJsonFeatureCollection(); // invalid => empty

        source = (source ?? _opt.DefaultSource).Trim().ToLowerInvariant();
        aid = (aid ?? _opt.DefaultAid).Trim().ToUpperInvariant();

        var cacheKey = $"atcf:{source}:{eventId}:{aid}";
        if (_cache.TryGetValue(cacheKey, out GeoJsonFeatureCollection? cached) && cached != null)
            return cached;

        var src = GetSource(source);
        if (src == null) return new GeoJsonFeatureCollection();

        // Build URLs
        var aUrl = ApplyTemplate(src.ADeckUrlTemplate, basin, storm, year);
        var bUrl = ApplyTemplate(src.BDeckUrlTemplate, basin, storm, year);

        // download (a-deck optional, b-deck optional)
        var aTextTask = DownloadMaybeGzipAsync(aUrl, src.UserAgent, src.TimeoutSeconds, ct);
        var bTextTask = DownloadMaybeGzipAsync(bUrl, src.UserAgent, src.TimeoutSeconds, ct);

        await Task.WhenAll(aTextTask, bTextTask);

        var aText = aTextTask.Result;
        var bText = bTextTask.Result;

        var aRecords = AtcfParser.ParseDeck(aText);
        var bRecords = AtcfParser.ParseDeck(bText);

        var fc = BuildGeoJson(eventId, source, aid, aRecords, bRecords);

        // cache 2 phút
        _cache.Set(cacheKey, fc, TimeSpan.FromMinutes(2));
        return fc;
    }

    private GeoJsonFeatureCollection BuildGeoJson(
        string eventId,
        string source,
        string aid,
        List<AtcfRecord> aDeck,
        List<AtcfRecord> bDeck)
    {
        var fc = new GeoJsonFeatureCollection();

        // ===== b-deck: best track =====
        // ưu tiên TECH=BEST, nếu không có thì lấy CARQ/khác
        var best = bDeck
            .Where(r => r.TauHours == 0)
            .OrderBy(r => r.DtgUtc)
            .ToList();

        // nếu có BEST thì lọc BEST
        if (best.Any(r => r.Technique == "BEST"))
            best = best.Where(r => r.Technique == "BEST").OrderBy(r => r.DtgUtc).ToList();
        else if (best.Any(r => r.Technique == "CARQ"))
            best = best.Where(r => r.Technique == "CARQ").OrderBy(r => r.DtgUtc).ToList();

        if (best.Count >= 2)
        {
            fc.Features.Add(new GeoJsonFeature
            {
                Geometry = new GeoJsonGeometry
                {
                    Type = "LineString",
                    Coordinates = best.Select(r => new[] { r.Lng, r.Lat }).ToArray()
                },
                Properties = new Dictionary<string, object?>
                {
                    ["kind"] = "bestTrack",
                    ["eventId"] = eventId,
                    ["source"] = source
                }
            });
        }

        // center point: lấy điểm mới nhất từ b-deck nếu có
        AtcfRecord? center = best.LastOrDefault();
        if (center != null)
        {
            fc.Features.Add(new GeoJsonFeature
            {
                Geometry = new GeoJsonGeometry
                {
                    Type = "Point",
                    Coordinates = new[] { center.Lng, center.Lat }
                },
                Properties = new Dictionary<string, object?>
                {
                    ["kind"] = "center",
                    ["eventId"] = eventId,
                    ["source"] = source,
                    ["name"] = eventId,
                    ["time"] = center.DtgUtc,
                    ["vmaxKt"] = center.VmaxKt,
                    ["mslpMb"] = center.MslpMb,
                    ["technique"] = center.Technique
                }
            });
        }

        // ===== a-deck: forecast track theo AID =====
        // logic: chọn cycle (DTG) mới nhất của aid đó, rồi lấy các tau tăng dần
        var aByAid = aDeck.Where(r => r.Technique == aid).ToList();
        if (aByAid.Count > 0)
        {
            var latestCycle = aByAid.Max(r => r.DtgUtc);

            var fcst = aByAid
                .Where(r => r.DtgUtc == latestCycle)
                .OrderBy(r => r.TauHours)
                .ToList();

            // Forecast line (nếu có >= 2 điểm)
            if (fcst.Count >= 2)
            {
                fc.Features.Add(new GeoJsonFeature
                {
                    Geometry = new GeoJsonGeometry
                    {
                        Type = "LineString",
                        Coordinates = fcst.Select(r => new[] { r.Lng, r.Lat }).ToArray()
                    },
                    Properties = new Dictionary<string, object?>
                    {
                        ["kind"] = "forecastTrack",
                        ["eventId"] = eventId,
                        ["source"] = source,
                        ["aid"] = aid,
                        ["cycle"] = latestCycle
                    }
                });
            }

            // Forecast points
            foreach (var p in fcst)
            {
                fc.Features.Add(new GeoJsonFeature
                {
                    Geometry = new GeoJsonGeometry
                    {
                        Type = "Point",
                        Coordinates = new[] { p.Lng, p.Lat }
                    },
                    Properties = new Dictionary<string, object?>
                    {
                        ["kind"] = "forecastPoint",
                        ["eventId"] = eventId,
                        ["source"] = source,
                        ["aid"] = aid,
                        ["cycle"] = latestCycle,
                        ["tau"] = p.TauHours,
                        ["time"] = p.DtgUtc.AddHours(p.TauHours),
                        ["vmaxKt"] = p.VmaxKt,
                        ["mslpMb"] = p.MslpMb
                    }
                });
            }

            // nếu b-deck chưa có center thì dùng tau=0 của forecast làm center
            if (center == null)
            {
                var tau0 = fcst.FirstOrDefault(x => x.TauHours == 0) ?? fcst.First();
                fc.Features.Add(new GeoJsonFeature
                {
                    Geometry = new GeoJsonGeometry
                    {
                        Type = "Point",
                        Coordinates = new[] { tau0.Lng, tau0.Lat }
                    },
                    Properties = new Dictionary<string, object?>
                    {
                        ["kind"] = "center",
                        ["eventId"] = eventId,
                        ["source"] = source,
                        ["name"] = eventId,
                        ["time"] = tau0.DtgUtc,
                        ["vmaxKt"] = tau0.VmaxKt,
                        ["mslpMb"] = tau0.MslpMb,
                        ["aid"] = aid
                    }
                });
            }
        }

        return fc;
    }

    private AtcfSourceOptions? GetSource(string source)
    {
        if (_opt.Sources.TryGetValue(source, out var s)) return s;
        // fallback: lấy source đầu tiên
        return _opt.Sources.Values.FirstOrDefault();
    }

    private static string ApplyTemplate(string template, string basin, string storm, string year)
    {
        return (template ?? "")
            .Replace("{basin}", basin.ToLowerInvariant())
            .Replace("{storm}", storm)
            .Replace("{year}", year);
    }

    private async Task<string> DownloadMaybeGzipAsync(string url, string userAgent, int timeoutSec, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(url)) return "";

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(timeoutSec, 3, 30)));

            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.UserAgent.ParseAdd(userAgent);

            using var res = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            if (!res.IsSuccessStatusCode) return "";

            await using var stream = await res.Content.ReadAsStreamAsync(cts.Token);

            // detect gzip by extension OR content header
            var isGz = url.EndsWith(".gz", StringComparison.OrdinalIgnoreCase)
                       || (res.Content.Headers.ContentEncoding?.Any(x => x.Contains("gzip")) ?? false);

            if (!isGz)
            {
                using var sr = new StreamReader(stream);
                return await sr.ReadToEndAsync(cts.Token);
            }

            await using var gz = new GZipStream(stream, CompressionMode.Decompress);
            using var srGz = new StreamReader(gz);
            return await srGz.ReadToEndAsync(cts.Token);
        }
        catch
        {
            return "";
        }
    }

    // eventId kiểu: WP012026 (basin WP, storm 01, year 2026)
    private static bool TryParseEventId(string eventId, out string basin, out string storm, out string year)
    {
        basin = ""; storm = ""; year = "";
        if (string.IsNullOrWhiteSpace(eventId)) return false;

        eventId = eventId.Trim().ToUpperInvariant();
        if (eventId.Length != 8) return false;

        basin = eventId.Substring(0, 2);
        storm = eventId.Substring(2, 2);
        year = eventId.Substring(4, 4);

        if (!storm.All(char.IsDigit)) return false;
        if (!year.All(char.IsDigit)) return false;
        if (!basin.All(char.IsLetter)) return false;

        return true;
    }
}
