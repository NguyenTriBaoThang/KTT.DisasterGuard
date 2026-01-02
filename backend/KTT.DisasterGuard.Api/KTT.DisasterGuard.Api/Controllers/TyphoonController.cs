using KTT.DisasterGuard.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/typhoon")]
public class TyphoonController : ControllerBase
{
    private readonly JmaTyphoonService _svc;

    public TyphoonController(JmaTyphoonService svc)
    {
        _svc = svc;
    }

    // Public cũng được, vì chỉ là dữ liệu thời tiết
    [HttpGet("active")]
    public async Task<IActionResult> GetActive(CancellationToken ct)
    {
        var geo = await _svc.GetActiveTyphoonGeoJsonAsync(ct);
        return Ok(geo);
    }
}