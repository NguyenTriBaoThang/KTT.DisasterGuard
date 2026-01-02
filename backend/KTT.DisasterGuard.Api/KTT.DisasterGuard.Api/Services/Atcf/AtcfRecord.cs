namespace KTT.DisasterGuard.Api.Services.Atcf;

public sealed class AtcfRecord
{
    public string Basin { get; set; } = "";     // WP, IO, SH...
    public string Storm { get; set; } = "";     // 01..99
    public DateTime DtgUtc { get; set; }        // YYYYMMDDHH (UTC)

    public string Technique { get; set; } = ""; // BEST/CARQ (bdeck) or JTWC/OFCL/... (adeck)
    public int TauHours { get; set; }           // forecast hour (0, 12, 24...)
    public double Lat { get; set; }             // decimal degrees
    public double Lng { get; set; }             // decimal degrees

    public int? VmaxKt { get; set; }            // knots
    public int? MslpMb { get; set; }            // mb

    public bool IsForecast => TauHours > 0;
}
