namespace KTT.DisasterGuard.Api.Services.Atcf;

public sealed class AtcfOptions
{
    public string DefaultSource { get; set; } = "jtwc";
    public string DefaultAid { get; set; } = "JTWC";

    // Nếu bạn muốn /api/cyclone/active tự có storm để test, add vào đây:
    // VD: ["WP012026","WP022026"]
    public List<string> DefaultActiveEventIds { get; set; } = new();

    public Dictionary<string, AtcfSourceOptions> Sources { get; set; } = new();
}

public sealed class AtcfSourceOptions
{
    public string UserAgent { get; set; } = "KTT-DisasterGuard/1.0";
    public int TimeoutSeconds { get; set; } = 12;

    // Template: a{basin}{storm}{year}.dat(.gz)
    public string ADeckUrlTemplate { get; set; } = "";

    // Template: b{basin}{storm}{year}.dat
    public string BDeckUrlTemplate { get; set; } = "";
}
