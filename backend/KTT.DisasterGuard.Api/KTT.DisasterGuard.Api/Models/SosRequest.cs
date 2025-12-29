using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Models;

public class SosRequest
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    // ✅ RESCUE/ADMIN nhận ca
    public Guid? RescuerId { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    // PENDING | ACCEPTED | RESCUED | CANCELLED
    [MaxLength(20)]
    public string Status { get; set; } = "PENDING";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // ✅ tracking
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    public DateTime? RescuedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
}
