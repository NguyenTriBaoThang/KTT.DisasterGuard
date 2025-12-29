using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Dtos;
using KTT.DisasterGuard.Api.Helpers;
using KTT.DisasterGuard.Api.Hubs;
using KTT.DisasterGuard.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/location")]
[Authorize]
public class LocationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<RealtimeHub> _hub;

    public LocationController(AppDbContext db, IHubContext<RealtimeHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [HttpPost("update")]
    public async Task<IActionResult> UpdateLocation(UpdateLocationRequest req)
    {
        var userId = User.GetUserId();

        var location = await _db.Locations.FirstOrDefaultAsync(x => x.UserId == userId);

        if (location == null)
        {
            location = new Location { UserId = userId };
            _db.Locations.Add(location);
        }

        location.Latitude = req.Latitude;
        location.Longitude = req.Longitude;
        location.Accuracy = req.Accuracy;
        location.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var dto = new
        {
            userId,
            latitude = location.Latitude,
            longitude = location.Longitude,
            accuracy = location.Accuracy,
            updatedAt = location.UpdatedAt
        };

        // ✅ broadcast cho rescue/admin
        await _hub.Clients.Group("rescue").SendAsync("locationUpdated", dto);

        return Ok(new LocationResponse
        {
            Latitude = location.Latitude,
            Longitude = location.Longitude,
            Accuracy = location.Accuracy,
            UpdatedAt = location.UpdatedAt
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyLocation()
    {
        var userId = User.GetUserId();

        var location = await _db.Locations.FirstOrDefaultAsync(x => x.UserId == userId);
        if (location == null) return NotFound("Location not found");

        return Ok(new LocationResponse
        {
            Latitude = location.Latitude,
            Longitude = location.Longitude,
            Accuracy = location.Accuracy,
            UpdatedAt = location.UpdatedAt
        });
    }

    [HttpGet("active")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> GetActiveLocations()
    {
        var list = await _db.Locations.OrderByDescending(x => x.UpdatedAt).ToListAsync();
        return Ok(list);
    }
}
