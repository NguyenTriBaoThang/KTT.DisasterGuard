using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Dtos;
using KTT.DisasterGuard.Api.Hubs;
using KTT.DisasterGuard.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/disaster")]
public class DisasterController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<RealtimeHub> _hub;

    public DisasterController(AppDbContext db, IHubContext<RealtimeHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [HttpPost("mock")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> CreateMock(CreateDisasterMockRequest req)
    {
        var ev = new DisasterEvent
        {
            Type = req.Type.ToUpper(),
            Severity = req.Severity.ToUpper(),
            CenterLat = req.CenterLat,
            CenterLng = req.CenterLng,
            RadiusMeters = req.RadiusMeters,
            PolygonGeoJson = req.PolygonGeoJson,
            IsActive = true
        };

        _db.DisasterEvents.Add(ev);
        await _db.SaveChangesAsync();

        var dto = ToResponse(ev);

        // ✅ broadcast cho mọi client (dashboard)
        await _hub.Clients.All.SendAsync("disasterChanged", new { action = "CREATED", disaster = dto });

        return Ok(dto);
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var list = await _db.DisasterEvents
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(list.Select(ToResponse));
    }

    [HttpPost("{id:guid}/deactivate")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var ev = await _db.DisasterEvents.FirstOrDefaultAsync(x => x.Id == id);
        if (ev == null) return NotFound();

        ev.IsActive = false;
        await _db.SaveChangesAsync();

        var dto = ToResponse(ev);

        // ✅ broadcast
        await _hub.Clients.All.SendAsync("disasterChanged", new { action = "DEACTIVATED", disaster = dto });

        return Ok(dto);
    }

    private static DisasterResponse ToResponse(DisasterEvent ev) => new DisasterResponse
    {
        Id = ev.Id,
        Type = ev.Type,
        Severity = ev.Severity,
        CenterLat = ev.CenterLat,
        CenterLng = ev.CenterLng,
        RadiusMeters = ev.RadiusMeters,
        PolygonGeoJson = ev.PolygonGeoJson,
        CreatedAt = ev.CreatedAt,
        IsActive = ev.IsActive
    };
}
