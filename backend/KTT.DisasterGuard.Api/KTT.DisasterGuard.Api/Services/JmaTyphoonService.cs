using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace KTT.DisasterGuard.Api.Services;

public sealed class JmaTyphoonService
{
    private readonly HttpClient _http;

    // BaseAddress sẽ set ở Program.cs: https://www.jma.go.jp/bosai/
    public JmaTyphoonService(HttpClient http)
    {
        _http = http;
    }

    // GeoJSON FeatureCollection (gộp tất cả typhoon đang active)
    public async Task<object> GetActiveTyphoonGeoJsonAsync(CancellationToken ct = default)
    {
        // 1) lấy danh sách eventId từ /information/data/typhoon.json
        // (JMA Bosai typhoon feed)
        var activeJson = await _http.GetStringAsync("information/data/typhoon.json", ct);
        var activeNode = JsonNode.Parse(activeJson);

        var eventIds = ExtractEventIds(activeNode);

        // Không có bão active
        if (eventIds.Count == 0)
        {
            return new
            {
                type = "FeatureCollection",
                features = Array.Empty<object>(),
                meta = new { provider = "JMA", note = "No active typhoon in JMA feed." }
            };
        }

        var features = new List<object>();

        foreach (var eventId in eventIds)
        {
            // 2) lấy detail/specifications.json theo eventId
            // https://www.jma.go.jp/bosai/typhoon/data/{eventId}/specifications.json  :contentReference[oaicite:1]{index=1}
            var specJson = await _http.GetStringAsync($"typhoon/data/{eventId}/specifications.json", ct);
            var specNode = JsonNode.Parse(specJson);

            // 3) parse track points (analysis + forecast positions)
            var points = ExtractTrackPoints(specNode);

            if (points.Count == 0) continue;

            // name (nếu có)
            var name = ExtractName(specNode) ?? eventId;

            // xác định "current/analysis": chọn điểm có thời gian nhỏ nhất
            var analysisTime = points.Min(p => p.ValidTimeUtc);
            var ordered = points
                .OrderBy(p => p.ValidTimeUtc)
                .Select(p =>
                {
                    var hour = (int)Math.Round((p.ValidTimeUtc - analysisTime).TotalHours);
                    return p with
                    {
                        ForecastHour = Math.Max(0, hour),
                        IsForecast = hour > 0
                    };
                })
                .ToList();

            var center = ordered.First(); // current/analysis

            // (A) Feature: storm center (Point)
            features.Add(new
            {
                type = "Feature",
                geometry = new
                {
                    type = "Point",
                    // GeoJSON order: [lng, lat]
                    coordinates = new[] { center.Lng, center.Lat }
                },
                properties = new Dictionary<string, object?>
                {
                    ["kind"] = "storm_center",
                    ["provider"] = "JMA",
                    ["eventId"] = eventId,
                    ["name"] = name,
                    ["timeUtc"] = center.ValidTimeUtc.ToString("O"),
                    ["pressureHpa"] = center.PressureHpa,
                    ["maxWindMs"] = center.MaxWindMs,
                    ["intensity"] = center.Intensity,
                    ["forecastHour"] = 0
                }
            });

            // (B) Feature: forecast track (LineString) — từ current -> các điểm tương lai
            var lineCoords = ordered
                .Where(p => p.ForecastHour >= 0) // gồm cả điểm current
                .Select(p => new[] { p.Lng, p.Lat })
                .ToArray();

            if (lineCoords.Length >= 2)
            {
                features.Add(new
                {
                    type = "Feature",
                    geometry = new
                    {
                        type = "LineString",
                        coordinates = lineCoords
                    },
                    properties = new Dictionary<string, object?>
                    {
                        ["kind"] = "forecast_track",
                        ["provider"] = "JMA",
                        ["eventId"] = eventId,
                        ["name"] = name
                    }
                });
            }

            // (C) Feature: forecast points (Point) — từng điểm dự báo để hiện tooltip/ETA
            foreach (var p in ordered.Where(x => x.IsForecast))
            {
                features.Add(new
                {
                    type = "Feature",
                    geometry = new
                    {
                        type = "Point",
                        coordinates = new[] { p.Lng, p.Lat }
                    },
                    properties = new Dictionary<string, object?>
                    {
                        ["kind"] = "forecast_point",
                        ["provider"] = "JMA",
                        ["eventId"] = eventId,
                        ["name"] = name,
                        ["timeUtc"] = p.ValidTimeUtc.ToString("O"),
                        ["forecastHour"] = p.ForecastHour,
                        ["pressureHpa"] = p.PressureHpa,
                        ["maxWindMs"] = p.MaxWindMs,
                        ["intensity"] = p.Intensity
                    }
                });
            }
        }

        return new
        {
            type = "FeatureCollection",
            features,
            meta = new
            {
                provider = "JMA",
                updatedAtUtc = DateTime.UtcNow.ToString("O")
            }
        };
    }

    // -------------------- Parsing helpers --------------------

    private static List<string> ExtractEventIds(JsonNode? root)
    {
        var result = new List<string>();
        if (root is not JsonArray arr) return result;

        foreach (var item in arr)
        {
            if (item is not JsonObject obj) continue;

            var id =
                obj["eventId"]?.GetValue<string>() ??
                obj["eventID"]?.GetValue<string>() ??
                obj["id"]?.GetValue<string>();

            if (!string.IsNullOrWhiteSpace(id))
                result.Add(id);
        }

        return result.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static string? ExtractName(JsonNode? root)
    {
        // cố gắng tìm "name" ở nhiều dạng
        if (root is JsonObject o)
        {
            var direct = o["name"]?.ToString();
            if (!string.IsNullOrWhiteSpace(direct)) return direct;

            // nếu name là object {ja/en/...}
            if (o["name"] is JsonObject nameObj)
            {
                var en = nameObj["en"]?.ToString();
                var ja = nameObj["ja"]?.ToString();
                return en ?? ja;
            }
        }

        // fallback: tìm trong cây JSON
        var nameNode = FindFirstByKey(root, "name");
        var s = nameNode?.ToString();
        return string.IsNullOrWhiteSpace(s) ? null : s;
    }

    private static JsonNode? FindFirstByKey(JsonNode? node, string key)
    {
        if (node is JsonObject obj)
        {
            if (obj.TryGetPropertyValue(key, out var v) && v != null) return v;
            foreach (var kv in obj)
            {
                var found = FindFirstByKey(kv.Value, key);
                if (found != null) return found;
            }
        }
        else if (node is JsonArray arr)
        {
            foreach (var child in arr)
            {
                var found = FindFirstByKey(child, key);
                if (found != null) return found;
            }
        }
        return null;
    }

    private static List<TrackPoint> ExtractTrackPoints(JsonNode? specRoot)
    {
        var list = new List<TrackPoint>();

        // specs có thể là array hoặc nested array trong object => tìm array “giống track”
        var trackArray = FindTrackArray(specRoot);
        if (trackArray == null) return list;

        foreach (var n in trackArray)
        {
            if (n is not JsonObject obj) continue;

            // time
            var tStr =
                obj["validtime"]?.ToString() ??
                obj["validTime"]?.ToString() ??
                obj["time"]?.ToString();

            if (!TryParseTime(tStr, out var timeUtc)) continue;

            // position
            if (!TryReadLatLng(obj, out var lat, out var lng)) continue;

            // optional: pressure / max wind / intensity
            double? pressure = TryReadDouble(obj["pressure"]);
            double? maxWind = TryReadDouble(
                obj["maximumWind"]?["sustained"] ??
                obj["maximumWind"]?["value"] ??
                obj["maxWind"]
            );

            var intensity = obj["intensity"]?.ToString();

            list.Add(new TrackPoint(
                ValidTimeUtc: timeUtc,
                Lat: lat,
                Lng: lng,
                IsForecast: false,
                ForecastHour: 0,
                PressureHpa: pressure,
                MaxWindMs: maxWind,
                Intensity: intensity
            ));
        }

        return list;
    }

    private static JsonArray? FindTrackArray(JsonNode? node)
    {
        if (node is JsonArray arr)
        {
            // heuristic: phần tử object có "position" + "validtime"
            if (arr.Count > 0 && arr[0] is JsonObject o)
            {
                var hasPos = o.ContainsKey("position") || o.ContainsKey("center") || o.ContainsKey("pos");
                var hasTime = o.ContainsKey("validtime") || o.ContainsKey("validTime") || o.ContainsKey("time");
                if (hasPos && hasTime) return arr;
            }

            foreach (var child in arr)
            {
                var found = FindTrackArray(child);
                if (found != null) return found;
            }
        }

        if (node is JsonObject obj)
        {
            foreach (var kv in obj)
            {
                var found = FindTrackArray(kv.Value);
                if (found != null) return found;
            }
        }

        return null;
    }

    private static bool TryReadLatLng(JsonObject step, out double lat, out double lng)
    {
        lat = 0; lng = 0;

        // Ưu tiên: position.deg.lat/lon
        var pos = step["position"] as JsonObject ?? step["center"] as JsonObject ?? step["pos"] as JsonObject;
        if (pos != null)
        {
            // deg
            if (pos["deg"] is JsonObject deg)
            {
                var latNode = deg["lat"] ?? deg["latitude"];
                var lngNode = deg["lon"] ?? deg["lng"] ?? deg["longitude"];
                if (TryReadCoord(latNode, out lat) && TryReadCoord(lngNode, out lng))
                    return true;
            }

            // direct
            if (TryReadCoord(pos["lat"] ?? pos["latitude"], out lat) &&
                TryReadCoord(pos["lon"] ?? pos["lng"] ?? pos["longitude"], out lng))
                return true;

            // dm (degree-minute) — nếu có, convert về decimal
            if (pos["dm"] is JsonObject dm)
            {
                if (TryReadDm(dm["lat"], out lat) && TryReadDm(dm["lon"] ?? dm["lng"], out lng))
                    return true;
            }
        }

        // fallback: tìm lat/lng bất kỳ trong object
        var latAny = FindFirstByKey(step, "lat") ?? FindFirstByKey(step, "latitude");
        var lngAny = FindFirstByKey(step, "lon") ?? FindFirstByKey(step, "lng") ?? FindFirstByKey(step, "longitude");

        return TryReadCoord(latAny, out lat) && TryReadCoord(lngAny, out lng);
    }

    private static bool TryReadCoord(JsonNode? node, out double value)
    {
        value = 0;
        if (node == null) return false;

        // number
        if (node is JsonValue jv)
        {
            if (jv.TryGetValue<double>(out var d)) { value = d; return true; }
            if (jv.TryGetValue<int>(out var i)) { value = i; return true; }
        }

        // string like "12.3N" / "110.2E"
        var s = node.ToString().Trim();
        if (string.IsNullOrWhiteSpace(s)) return false;

        // N/S/E/W handling
        var sign = 1.0;
        if (s.EndsWith("S", StringComparison.OrdinalIgnoreCase) ||
            s.EndsWith("W", StringComparison.OrdinalIgnoreCase))
        {
            sign = -1.0;
        }

        s = s.TrimEnd('N', 'S', 'E', 'W', 'n', 's', 'e', 'w');

        if (double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
        {
            value = parsed * sign;
            return true;
        }

        // fallback local culture
        if (double.TryParse(s, NumberStyles.Float, CultureInfo.CurrentCulture, out parsed))
        {
            value = parsed * sign;
            return true;
        }

        return false;
    }

    private static bool TryReadDm(JsonNode? node, out double value)
    {
        value = 0;
        if (node == null) return false;

        // case object: {degree: xx, minute: yy, ...}
        if (node is JsonObject o)
        {
            var deg = TryReadDouble(o["degree"]) ?? TryReadDouble(o["deg"]);
            var min = TryReadDouble(o["minute"]) ?? TryReadDouble(o["min"]);
            if (deg.HasValue && min.HasValue)
            {
                value = deg.Value + (min.Value / 60.0);
                return true;
            }
        }

        // case string "20 30N" or "20:30N"
        var s = node.ToString().Trim();
        if (string.IsNullOrWhiteSpace(s)) return false;

        var sign = 1.0;
        if (s.EndsWith("S", StringComparison.OrdinalIgnoreCase) ||
            s.EndsWith("W", StringComparison.OrdinalIgnoreCase))
        {
            sign = -1.0;
        }
        s = s.TrimEnd('N', 'S', 'E', 'W', 'n', 's', 'e', 'w');

        s = s.Replace(":", " ").Replace(",", " ");
        var parts = s.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2 &&
            double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var deg2) &&
            double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var min2))
        {
            value = (deg2 + min2 / 60.0) * sign;
            return true;
        }

        return false;
    }

    private static double? TryReadDouble(JsonNode? node)
    {
        if (node == null) return null;
        if (node is JsonValue jv)
        {
            if (jv.TryGetValue<double>(out var d)) return d;
            if (jv.TryGetValue<int>(out var i)) return i;
        }
        if (double.TryParse(node.ToString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var p))
            return p;
        return null;
    }

    private static bool TryParseTime(string? s, out DateTime utc)
    {
        utc = default;
        if (string.IsNullOrWhiteSpace(s)) return false;

        // JMA thường là ISO8601 (vd: 2025-08-01T00:00:00+09:00)
        if (DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dto))
        {
            utc = dto.UtcDateTime;
            return true;
        }

        // fallback
        if (DateTime.TryParse(s, out var dt))
        {
            utc = DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            return true;
        }

        return false;
    }

    // track point record
    private record TrackPoint(
        DateTime ValidTimeUtc,
        double Lat,
        double Lng,
        bool IsForecast,
        int ForecastHour,
        double? PressureHpa,
        double? MaxWindMs,
        string? Intensity
    );
}