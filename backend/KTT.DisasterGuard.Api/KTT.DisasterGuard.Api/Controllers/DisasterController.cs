using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Dtos;
using KTT.DisasterGuard.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/disaster")]
public class DisasterController : ControllerBase
{
    private readonly AppDbContext _db;

    public DisasterController(AppDbContext db)
    {
        _db = db;
    }

    // Mock AI tạo 1 sự kiện thiên tai (Admin/Rescue)
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

        return Ok(ToResponse(ev));
    }

    // Lấy danh sách sự kiện đang active (public hoặc authorize tùy bạn)
    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var list = await _db.DisasterEvents
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(list.Select(ToResponse));
    }

    // Tắt sự kiện (Admin/Rescue)
    [HttpPost("{id:guid}/deactivate")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var ev = await _db.DisasterEvents.FirstOrDefaultAsync(x => x.Id == id);
        if (ev == null) return NotFound();

        ev.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok(ToResponse(ev));
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
