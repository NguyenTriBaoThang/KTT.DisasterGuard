using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Dtos;
using KTT.DisasterGuard.Api.Extensions;
using KTT.DisasterGuard.Api.Hubs;
using KTT.DisasterGuard.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/sos")]
[Authorize]
public class SosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<RealtimeHub> _hub;

    public SosController(AppDbContext db, IHubContext<RealtimeHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    // USER bấm SOS
    [HttpPost]
    public async Task<IActionResult> CreateSos(SosCreateRequest req)
    {
        if (!User.TryGetUserId(out var userId))
            return Unauthorized("Missing/invalid user id claim.");

        var now = DateTime.UtcNow;

        var sos = new SosRequest
        {
            UserId = userId,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            Status = "PENDING",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.SosRequests.Add(sos);
        await _db.SaveChangesAsync();

        var payload = ToDetail(sos);

        // ✅ Realtime: báo cho RESCUE/ADMIN
        await _hub.Clients.Group("rescue").SendAsync("sosUpdated", payload);

        return Ok(new SosResponse
        {
            Id = sos.Id,
            Status = sos.Status,
            CreatedAt = sos.CreatedAt
        });
    }

    // RESCUE / ADMIN xem SOS
    [HttpGet]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> GetSos([FromQuery] string? status = null)
    {
        var q = _db.SosRequests.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToUpperInvariant();
            if (st == "ACTIVE")
                q = q.Where(x => x.Status == "PENDING" || x.Status == "ACCEPTED");
            else
                q = q.Where(x => x.Status == st);
        }
        else
        {
            q = q.Where(x => x.Status == "PENDING" || x.Status == "ACCEPTED");
        }

        var list = await q.OrderByDescending(x => x.CreatedAt).ToListAsync();
        return Ok(list.Select(ToDetail));
    }

    // RESCUE/ADMIN nhận SOS (atomic)
    [HttpPost("{id:guid}/accept")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> Accept(Guid id)
    {
        if (!User.TryGetUserId(out var rescuerId))
            return Unauthorized("Missing/invalid user id claim.");

        var now = DateTime.UtcNow;

        var rows = await _db.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE SosRequests
            SET Status = {"ACCEPTED"},
                RescuerId = {rescuerId},
                AcceptedAt = {now},
                UpdatedAt = {now}
            WHERE Id = {id} AND Status = {"PENDING"};
        ");

        if (rows == 0)
            return Conflict("SOS đã được nhận hoặc không còn PENDING.");

        var sos = await _db.SosRequests.FirstAsync(x => x.Id == id);
        var payload = ToDetail(sos);

        await _hub.Clients.Group("rescue").SendAsync("sosUpdated", payload);

        return Ok(payload);
    }

    // RESCUE/ADMIN cập nhật kết thúc
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> UpdateStatus(Guid id, SosUpdateStatusRequest req)
    {
        if (!User.TryGetUserId(out var actorId))
            return Unauthorized("Missing/invalid user id claim.");

        var now = DateTime.UtcNow;
        var status = (req.Status ?? "").Trim().ToUpperInvariant();

        if (status != "RESCUED" && status != "CANCELLED")
            return BadRequest("Status chỉ cho phép: RESCUED hoặc CANCELLED.");

        var sos = await _db.SosRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (sos == null) return NotFound();

        var isAdmin = User.IsInRole("ADMIN");

        if (!isAdmin && sos.RescuerId != actorId)
            return Forbid("Không thuộc quyền xử lý SOS này.");

        if (sos.Status == "RESCUED" || sos.Status == "CANCELLED")
            return Conflict("SOS đã kết thúc.");

        sos.Status = status;
        sos.UpdatedAt = now;

        if (status == "RESCUED") sos.RescuedAt = now;
        if (status == "CANCELLED") sos.CancelledAt = now;

        await _db.SaveChangesAsync();

        var payload = ToDetail(sos);
        await _hub.Clients.Group("rescue").SendAsync("sosUpdated", payload);

        return Ok(payload);
    }

    private static SosDetailResponse ToDetail(SosRequest s) => new SosDetailResponse
    {
        Id = s.Id,
        UserId = s.UserId,
        RescuerId = s.RescuerId,
        Latitude = s.Latitude,
        Longitude = s.Longitude,
        Status = s.Status,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt,
        AcceptedAt = s.AcceptedAt,
        RescuedAt = s.RescuedAt,
        CancelledAt = s.CancelledAt
    };
}