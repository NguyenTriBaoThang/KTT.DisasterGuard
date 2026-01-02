using System.Globalization;
using System.Text.Json;

namespace KTT.DisasterGuard.Api.Services.Cyclone;

public class JmaBosaiCycloneTrackService : ICycloneTrackService
{
    private readonly HttpClient _http;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    // ✅ Active typhoon list (JMA Bosai)
    private const string ActiveListUrl = "https://www.jma.go.jp/bosai/information/data/typhoon.json";

    public JmaBosaiCycloneTrackService(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(15);
    }

    public async Task<string> GetRawActiveListAsync(CancellationToken ct = default)
        => await _http.GetStringAsync(ActiveListUrl, ct);

    public async Task<GeoJsonFeatureCollection> GetActiveCyclonesGeoJsonAsync(CancellationToken ct = default)
    {
        var fc = new GeoJsonFeatureCollection();

        string raw;
        try
        {
            raw = await _http.GetStringAsync(ActiveListUrl, ct);
        }
        catch
        {
            return fc; // network fail -> return empty
        }

        using var doc = JsonDocument.Parse(raw);
        if (doc.RootElement.ValueKind != JsonValueKind.Array) return fc;

        foreach (var item in doc.RootElement.EnumerateArray())
        {
            // ✅ eventId có thể khác key tên, nên thử nhiều key
            var eventId = TryGetString(item, "eventId", "eventID", "id", "event_id");
            var name = TryGetString(item, "name", "typhoonName", "title", "stormName");

            // Nếu có eventId thì thử lấy chi tiết (nếu có)
            JsonElement detailRoot = item;
            if (!string.IsNullOrWhiteSpace(eventId))
            {
                // Theo hướng dẫn phổ biến: /bosai/typhoon/data/{eventId}/specifications.json
                // Nếu JMA đổi file name, service vẫn chạy (chỉ không có track)
                var detailUrl = $"https://www.jma.go.jp/bosai/typhoon/data/{eventId}/specifications.json";
                try
                {
                    var detailRaw = await _http.GetStringAsync(detailUrl, ct);
                    using var detailDoc = JsonDocument.Parse(detailRaw);
                    detailRoot = detailDoc.RootElement.Clone();
                }
                catch
                {
                    // ignore, fallback dùng item
                }
            }

            // ✅ Heuristic: quét toàn JSON để tìm object chứa lat/lon
            var points = new List<CyclonePoint>();
            CollectPoints(detailRoot, points, kindHint: null);

            // nếu không tìm thấy điểm nào -> skip
            if (points.Count == 0) continue;

            // sort theo time nếu có
            var hasTime = points.Any(p => p.Time.HasValue);
            if (hasTime)
                points = points.OrderBy(p => p.Time ?? DateTimeOffset.MinValue).ToList();

            // dedup thô
            points = points
                .GroupBy(p => $"{p.Lat:F5},{p.Lng:F5},{p.Time?.ToUnixTimeSeconds() ?? 0}")
                .Select(g => g.First())
                .ToList();

            var last = points.Last();

            var stormId = eventId ?? TryGetString(item, "stormId", "sid") ?? Guid.NewGuid().ToString("N");
            var stormName = name ?? TryGetString(item, "enName", "jpName") ?? $"Cyclone {stormId[..Math.Min(8, stormId.Length)]}";

            // ✅ Point: storm center (latest)
            fc.Features.Add(new GeoJsonFeature
            {
                Geometry = new GeoJsonGeometry
                {
                    Type = "Point",
                    Coordinates = new[] { last.Lng, last.Lat } // [lng,lat]
                },
                Properties = new Dictionary<string, object?>
                {
                    ["source"] = "JMA",
                    ["stormId"] = stormId,
                    ["name"] = stormName,
                    ["time"] = last.Time?.ToString("O"),
                    ["kind"] = last.Kind
                }
            });

            // ✅ LineString: track (all points)
            var coords = points.Select(p => new[] { p.Lng, p.Lat }).ToList();
            var times = points.Select(p => p.Time?.ToString("O")).ToList();

            fc.Features.Add(new GeoJsonFeature
            {
                Geometry = new GeoJsonGeometry
                {
                    Type = "LineString",
                    Coordinates = coords
                },
                Properties = new Dictionary<string, object?>
                {
                    ["source"] = "JMA",
                    ["stormId"] = stormId,
                    ["name"] = stormName,
                    ["count"] = coords.Count,
                    ["times"] = times
                }
            });
        }

        return fc;
    }

    private static string? TryGetString(JsonElement obj, params string[] keys)
    {
        if (obj.ValueKind != JsonValueKind.Object) return null;
        foreach (var k in keys)
        {
            if (obj.TryGetProperty(k, out var v))
            {
                if (v.ValueKind == JsonValueKind.String) return v.GetString();
                if (v.ValueKind == JsonValueKind.Number) return v.GetRawText();
            }
        }
        return null;
    }

    private static double? TryGetDouble(JsonElement obj, params string[] keys)
    {
        if (obj.ValueKind != JsonValueKind.Object) return null;
        foreach (var k in keys)
        {
            if (!obj.TryGetProperty(k, out var v)) continue;

            if (v.ValueKind == JsonValueKind.Number && v.TryGetDouble(out var d)) return d;

            if (v.ValueKind == JsonValueKind.String)
            {
                var s = v.GetString();
                if (double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var ds))
                    return ds;
            }
        }
        return null;
    }

    private static DateTimeOffset? TryGetTime(JsonElement obj, params string[] keys)
    {
        if (obj.ValueKind != JsonValueKind.Object) return null;
        foreach (var k in keys)
        {
            if (!obj.TryGetProperty(k, out var v)) continue;

            if (v.ValueKind == JsonValueKind.String)
            {
                var s = v.GetString();
                if (DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dt))
                    return dt;
            }
        }
        return null;
    }

    private static void CollectPoints(JsonElement el, List<CyclonePoint> acc, string? kindHint)
    {
        switch (el.ValueKind)
        {
            case JsonValueKind.Object:
                {
                    // thử bắt lat/lon
                    var lat = TryGetDouble(el, "lat", "latitude", "centerLat", "y");
                    var lng = TryGetDouble(el, "lon", "lng", "longitude", "centerLng", "x");

                    if (lat.HasValue && lng.HasValue)
                    {
                        var t = TryGetTime(el, "time", "datetime", "validTime", "date", "dt");
                        var kind = kindHint ?? TryGetString(el, "type", "kind", "category");
                        acc.Add(new CyclonePoint(lat.Value, lng.Value, t, kind));
                    }

                    foreach (var p in el.EnumerateObject())
                    {
                        CollectPoints(p.Value, acc, kindHint ?? p.Name);
                    }
                    break;
                }
            case JsonValueKind.Array:
                {
                    foreach (var it in el.EnumerateArray())
                        CollectPoints(it, acc, kindHint);
                    break;
                }
        }
    }
}
