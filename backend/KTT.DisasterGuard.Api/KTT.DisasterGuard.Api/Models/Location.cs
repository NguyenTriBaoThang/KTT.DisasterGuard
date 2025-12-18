using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Models;

public class Location
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    // mét – optional
    public double? Accuracy { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
