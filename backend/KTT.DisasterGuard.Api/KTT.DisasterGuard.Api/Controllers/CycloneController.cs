using KTT.DisasterGuard.Api.Services.Cyclone;
using Microsoft.AspNetCore.Mvc;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/cyclone")]
public class CycloneController : ControllerBase
{
    private readonly ICycloneTrackService _svc;

    public CycloneController(ICycloneTrackService svc)
    {
        _svc = svc;
    }

    // ✅ GeoJSON: storm center (Point) + track (LineString)
    [HttpGet("active")]
    public async Task<IActionResult> GetActive(CancellationToken ct)
    {
        var geo = await _svc.GetActiveCyclonesGeoJsonAsync(ct);
        return Ok(geo);
    }

    // ✅ debug: xem raw JMA list
    [HttpGet("raw")]
    public async Task<IActionResult> Raw(CancellationToken ct)
    {
        var raw = await _svc.GetRawActiveListAsync(ct);
        return Content(raw, "application/json");
    }
}