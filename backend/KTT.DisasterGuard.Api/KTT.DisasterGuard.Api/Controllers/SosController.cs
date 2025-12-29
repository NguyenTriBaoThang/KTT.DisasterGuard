using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Dtos;
using KTT.DisasterGuard.Api.Extensions; // TryGetUserId()
using KTT.DisasterGuard.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/sos")]
[Authorize]
public class SosController : ControllerBase
{
    private readonly AppDbContext _db;

    public SosController(AppDbContext db)
    {
        _db = db;
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

        return Ok(new SosResponse
        {
            Id = sos.Id,
            Status = sos.Status,
            CreatedAt = sos.CreatedAt
        });
    }

    // RESCUE / ADMIN xem SOS
    // - mặc định: ACTIVE = PENDING + ACCEPTED
    // - filter: /api/sos?status=PENDING / ACCEPTED / RESCUED / CANCELLED
    [HttpGet]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> GetSos([FromQuery] string? status = null)
    {
        var q = _db.SosRequests.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToUpperInvariant();
            q = q.Where(x => x.Status == st);
        }
        else
        {
            q = q.Where(x => x.Status == "PENDING" || x.Status == "ACCEPTED");
        }

        var list = await q.OrderByDescending(x => x.CreatedAt).ToListAsync();
        return Ok(list.Select(ToDetail));
    }

    // ✅ RESCUE/ADMIN NHẬN SOS (atomic: chỉ 1 người nhận được)
    [HttpPost("{id:guid}/accept")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> Accept(Guid id)
    {
        if (!User.TryGetUserId(out var rescuerId))
            return Unauthorized("Missing/invalid user id claim.");

        var now = DateTime.UtcNow;

        // Atomic update tránh 2 người nhận cùng lúc
        var rows = await _db.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE SosRequests
            SET Status = {"ACCEPTED"},
                RescuerId = {rescuerId},
                AcceptedAt = {now},
                UpdatedAt = {now}
            WHERE Id = {id} AND Status = {"PENDING"};
        ");

        if (rows == 0)
            return Conflict("SOS đã được nhận hoặc không còn ở trạng thái PENDING.");

        var sos = await _db.SosRequests.FirstAsync(x => x.Id == id);
        return Ok(ToDetail(sos));
    }

    // ✅ RESCUE/ADMIN cập nhật kết thúc: RESCUED / CANCELLED
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

        // RESCUE chỉ được cập nhật ca của mình
        if (!isAdmin && sos.RescuerId != actorId)
            return Forbid("Bạn không được cập nhật SOS này (chưa nhận ca hoặc không thuộc bạn).");

        if (sos.Status == "RESCUED" || sos.Status == "CANCELLED")
            return Conflict("SOS đã kết thúc, không thể cập nhật nữa.");

        sos.Status = status;
        sos.UpdatedAt = now;

        if (status == "RESCUED") sos.RescuedAt = now;
        if (status == "CANCELLED") sos.CancelledAt = now;

        await _db.SaveChangesAsync();
        return Ok(ToDetail(sos));
    }

    // ✅ USER hủy SOS của mình
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelMySos(Guid id)
    {
        if (!User.TryGetUserId(out var userId))
            return Unauthorized("Missing/invalid user id claim.");

        var now = DateTime.UtcNow;

        var sos = await _db.SosRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (sos == null) return NotFound();

        if (sos.UserId != userId && !User.IsInRole("ADMIN"))
            return Forbid();

        if (sos.Status == "RESCUED" || sos.Status == "CANCELLED")
            return Conflict("SOS đã kết thúc, không thể hủy.");

        sos.Status = "CANCELLED";
        sos.CancelledAt = now;
        sos.UpdatedAt = now;

        await _db.SaveChangesAsync();
        return Ok(ToDetail(sos));
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
