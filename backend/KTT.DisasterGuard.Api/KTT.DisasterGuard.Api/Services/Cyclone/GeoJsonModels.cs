namespace KTT.DisasterGuard.Api.Services.Cyclone;

public class GeoJsonFeatureCollection
{
    public string Type { get; set; } = "FeatureCollection";
    public List<GeoJsonFeature> Features { get; set; } = new();
}

public class GeoJsonFeature
{
    public string Type { get; set; } = "Feature";
    public GeoJsonGeometry Geometry { get; set; } = new();
    public Dictionary<string, object?> Properties { get; set; } = new();
}

public class GeoJsonGeometry
{
    public string Type { get; set; } = "Point"; // Point | LineString
    public object Coordinates { get; set; } = new double[] { 0, 0 }; // [lng,lat] hoặc [[lng,lat],...]
}

public record CyclonePoint(double Lat, double Lng, DateTimeOffset? Time, string? Kind);
