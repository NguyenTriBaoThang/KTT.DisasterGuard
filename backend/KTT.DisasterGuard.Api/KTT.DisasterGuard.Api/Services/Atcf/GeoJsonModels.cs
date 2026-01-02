using System.Text.Json.Serialization;

namespace KTT.DisasterGuard.Api.Services.Atcf;

public sealed class GeoJsonFeatureCollection
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "FeatureCollection";

    [JsonPropertyName("features")]
    public List<GeoJsonFeature> Features { get; set; } = new();
}

public sealed class GeoJsonFeature
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "Feature";

    [JsonPropertyName("geometry")]
    public GeoJsonGeometry Geometry { get; set; } = new();

    [JsonPropertyName("properties")]
    public Dictionary<string, object?> Properties { get; set; } = new();
}

public sealed class GeoJsonGeometry
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "Point"; // Point | LineString

    // GeoJSON coords:
    // Point: [lng, lat]
    // LineString: [[lng,lat],[lng,lat],...]
    [JsonPropertyName("coordinates")]
    public object Coordinates { get; set; } = Array.Empty<double>();
}
