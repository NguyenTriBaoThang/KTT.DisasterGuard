using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Models;

public class DisasterEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    // FLOOD | STORM | LANDSLIDE ...
    [MaxLength(50)]
    public string Type { get; set; } = "FLOOD";

    // LOW | MEDIUM | HIGH | CRITICAL
    [MaxLength(20)]
    public string Severity { get; set; } = "MEDIUM";

    public double CenterLat { get; set; }
    public double CenterLng { get; set; }

    // meters
    public int RadiusMeters { get; set; } = 5000;

    // optional polygon as GeoJSON string
    public string? PolygonGeoJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;
}
