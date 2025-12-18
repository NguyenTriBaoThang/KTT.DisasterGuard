using System.Security.Claims;
using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Dtos;
using KTT.DisasterGuard.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/location")]
[Authorize]
public class LocationController : ControllerBase
{
    private readonly AppDbContext _db;

    public LocationController(AppDbContext db)
    {
        _db = db;
    }

    // USER update GPS (có thể gọi mỗi 15–30 phút)
    [HttpPost("update")]
    public async Task<IActionResult> UpdateLocation(UpdateLocationRequest req)
    {
        var userId = Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)!
        );

        var location = await _db.Locations
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (location == null)
        {
            location = new Location
            {
                UserId = userId
            };
            _db.Locations.Add(location);
        }

        location.Latitude = req.Latitude;
        location.Longitude = req.Longitude;
        location.Accuracy = req.Accuracy;
        location.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new LocationResponse
        {
            Latitude = location.Latitude,
            Longitude = location.Longitude,
            Accuracy = location.Accuracy,
            UpdatedAt = location.UpdatedAt
        });
    }

    // USER xem vị trí hiện tại của mình
    [HttpGet("me")]
    public async Task<IActionResult> GetMyLocation()
    {
        var userId = Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)!
        );

        var location = await _db.Locations
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (location == null)
            return NotFound("Location not found");

        return Ok(new LocationResponse
        {
            Latitude = location.Latitude,
            Longitude = location.Longitude,
            Accuracy = location.Accuracy,
            UpdatedAt = location.UpdatedAt
        });
    }

    // RESCUE / ADMIN xem tất cả vị trí gần nhất
    [HttpGet("active")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> GetActiveLocations()
    {
        var list = await _db.Locations
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync();

        return Ok(list);
    }
}
