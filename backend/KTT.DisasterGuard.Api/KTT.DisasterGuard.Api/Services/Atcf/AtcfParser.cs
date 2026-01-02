using System.Globalization;

namespace KTT.DisasterGuard.Api.Services.Atcf;

public static class AtcfParser
{
    public static List<AtcfRecord> ParseDeck(string text)
    {
        var list = new List<AtcfRecord>();
        if (string.IsNullOrWhiteSpace(text)) return list;

        using var sr = new StringReader(text);
        string? line;
        while ((line = sr.ReadLine()) != null)
        {
            line = line.Trim();
            if (line.Length == 0) continue;
            if (line.StartsWith("#")) continue;

            // ATCF decks thường là CSV bằng dấu phẩy
            var f = line.Split(',').Select(x => x.Trim()).ToArray();
            if (f.Length < 9) continue;

            // Common indices (a/b deck đều thường dùng các index này):
            // 0 basin, 1 storm#, 2 DTG, 4 technique/aid, 5 tau, 6 lat, 7 lon, 8 vmax, 9 mslp ...
            var basin = SafeUpper(f[0]);
            var storm = Safe2Digits(f[1]);

            if (!TryParseDtgUtc(f[2], out var dtgUtc)) continue;

            var technique = f.Length > 4 ? SafeUpper(f[4]) : "";
            var tau = f.Length > 5 ? TryInt(f[5]) : 0;

            var latStr = f.Length > 6 ? f[6] : "";
            var lonStr = f.Length > 7 ? f[7] : "";

            if (!TryParseLatLon(latStr, out var lat)) continue;
            if (!TryParseLatLon(lonStr, out var lng)) continue;

            int? vmax = null;
            if (f.Length > 8)
            {
                var x = TryInt(f[8]);
                if (x > 0) vmax = x;
            }

            int? mslp = null;
            if (f.Length > 9)
            {
                var x = TryInt(f[9]);
                if (x > 0) mslp = x;
            }

            list.Add(new AtcfRecord
            {
                Basin = basin,
                Storm = storm,
                DtgUtc = dtgUtc,
                Technique = technique,
                TauHours = tau,
                Lat = lat,
                Lng = lng,
                VmaxKt = vmax,
                MslpMb = mslp
            });
        }

        return list;
    }

    private static string SafeUpper(string? s) => (s ?? "").Trim().ToUpperInvariant();

    private static string Safe2Digits(string? s)
    {
        s = (s ?? "").Trim();
        if (s.Length == 1) return "0" + s;
        if (s.Length >= 2) return s.Substring(0, 2);
        return "00";
    }

    private static int TryInt(string? s)
    {
        if (int.TryParse((s ?? "").Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var v))
            return v;
        return 0;
    }

    // DTG: YYYYMMDDHH (UTC)
    private static bool TryParseDtgUtc(string? dtg, out DateTime utc)
    {
        utc = default;
        dtg = (dtg ?? "").Trim();
        if (dtg.Length < 10) return false;

        // format: 2026010100
        if (!DateTime.TryParseExact(dtg.Substring(0, 10), "yyyyMMddHH",
            CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out utc))
        {
            return false;
        }
        return true;
    }

    // "135N" => 13.5 ; "1234E" => 123.4
    private static bool TryParseLatLon(string? s, out double value)
    {
        value = 0;
        s = (s ?? "").Trim().ToUpperInvariant();
        if (s.Length < 2) return false;

        var hemi = s[^1];
        var num = s.Substring(0, s.Length - 1);

        if (!int.TryParse(num, NumberStyles.Integer, CultureInfo.InvariantCulture, out var raw))
            return false;

        value = raw / 10.0;

        if (hemi == 'S' || hemi == 'W') value = -value;
        return hemi is 'N' or 'S' or 'E' or 'W';
    }
}
