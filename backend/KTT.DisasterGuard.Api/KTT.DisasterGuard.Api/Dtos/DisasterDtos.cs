using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Dtos;

public class CreateDisasterMockRequest
{
    [Required] public string Type { get; set; } = "FLOOD";
    [Required] public string Severity { get; set; } = "HIGH";
    [Required] public double CenterLat { get; set; }
    [Required] public double CenterLng { get; set; }
    public int RadiusMeters { get; set; } = 5000;

    // optional polygon GeoJSON string
    public string? PolygonGeoJson { get; set; }
}

public class DisasterResponse
{
    public Guid Id { get; set; }
    public string Type { get; set; } = "";
    public string Severity { get; set; } = "";
    public double CenterLat { get; set; }
    public double CenterLng { get; set; }
    public int RadiusMeters { get; set; }
    public string? PolygonGeoJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}
