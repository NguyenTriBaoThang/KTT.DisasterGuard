using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Dtos;

public class SosUpdateStatusRequest
{
    // RESCUED | CANCELLED
    [Required]
    public string Status { get; set; } = string.Empty;
}

public class SosDetailResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? RescuerId { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public DateTime? AcceptedAt { get; set; }
    public DateTime? RescuedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
}

public class SosCreateRequest { 
    [Required] 
    public double Latitude { get; set; } 
    [Required] 
    public double Longitude { get; set; } 
}

public class SosResponse { 
    public Guid Id { get; set; } 
    public string Status { get; set; } = string.Empty; 
    public DateTime CreatedAt { get; set; } 
}