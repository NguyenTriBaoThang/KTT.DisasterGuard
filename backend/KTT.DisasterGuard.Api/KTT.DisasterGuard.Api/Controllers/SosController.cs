using System.Security.Claims;
using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Dtos;
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
        var userId = Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue(ClaimTypes.Name) ??
            User.FindFirstValue(ClaimTypes.Email)!
        );

        var sos = new SosRequest
        {
            UserId = userId,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            Status = "PENDING"
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

    // RESCUE / ADMIN xem danh sách SOS
    [HttpGet]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<IActionResult> GetActiveSos()
    {
        var list = await _db.SosRequests
            .Where(x => x.Status == "PENDING")
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(list);
    }
}
