using KTT.DisasterGuard.Api.Services.Atcf;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/cyclone")]
public sealed class CycloneController : ControllerBase
{
    private readonly IAtcfService _atcf;

    public CycloneController(IAtcfService atcf)
    {
        _atcf = atcf;
    }

    // ✅ Trả GeoJSON nhiều storm (merge)
    // VD: /api/cyclone/active?source=jtwc&aid=JTWC&eventIds=WP012026,WP022026
    [HttpGet("active")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<ActionResult<GeoJsonFeatureCollection>> GetActive(
        [FromQuery] string? source,
        [FromQuery] string? aid,
        [FromQuery] string? eventIds,
        CancellationToken ct)
    {
        var ids = ParseIds(eventIds);
        var fc = await _atcf.GetActiveGeoJsonAsync(ids, source, aid, ct);
        return Ok(fc);
    }

    // ✅ Trả GeoJSON theo 1 eventId ATCF (WP012026)
    [HttpGet("atcf/{eventId}")]
    [Authorize(Roles = "ADMIN,RESCUE")]
    public async Task<ActionResult<GeoJsonFeatureCollection>> GetByEventId(
        [FromRoute] string eventId,
        [FromQuery] string? source,
        [FromQuery] string? aid,
        CancellationToken ct)
    {
        var fc = await _atcf.GetCycloneGeoJsonByEventIdAsync(eventId, source, aid, ct);
        return Ok(fc);
    }

    private static IEnumerable<string> ParseIds(string? eventIds)
    {
        if (string.IsNullOrWhiteSpace(eventIds)) return Array.Empty<string>();

        return eventIds
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.ToUpperInvariant());
    }
}
