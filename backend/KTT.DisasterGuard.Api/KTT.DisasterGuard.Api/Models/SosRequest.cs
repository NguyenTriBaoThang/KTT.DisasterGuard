using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Models;

public class SosRequest
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    // PENDING | RESCUED | CANCELLED
    public string Status { get; set; } = "PENDING";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
