using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Dtos;

public class UpdateLocationRequest
{
    [Required]
    public double Latitude { get; set; }

    [Required]
    public double Longitude { get; set; }

    public double? Accuracy { get; set; }
}

public class LocationResponse
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Accuracy { get; set; }
    public DateTime UpdatedAt { get; set; }
}
