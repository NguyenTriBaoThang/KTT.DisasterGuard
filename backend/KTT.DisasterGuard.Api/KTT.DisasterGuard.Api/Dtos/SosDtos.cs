using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Dtos;

public class SosCreateRequest
{
    [Required]
    public double Latitude { get; set; }

    [Required]
    public double Longitude { get; set; }
}

public class SosResponse
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
