using System.Globalization;
using System.Text;
using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "ADMIN,RESCUE")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/reports/sos/stats?days=7
    [HttpGet("sos/stats")]
    public async Task<IActionResult> SosStats([FromQuery] int days = 7)
    {
        days = Math.Clamp(days, 1, 60);

        var now = DateTime.UtcNow;
        var start = now.Date.AddDays(-(days - 1)); // inclusive
        var end = now.Date.AddDays(1);            // exclusive

        var baseQ = _db.SosRequests.AsNoTracking();

        var total = await baseQ.CountAsync();
        var pending = await baseQ.CountAsync(x => x.Status == "PENDING");
        var accepted = await baseQ.CountAsync(x => x.Status == "ACCEPTED");
        var rescued = await baseQ.CountAsync(x => x.Status == "RESCUED");
        var cancelled = await baseQ.CountAsync(x => x.Status == "CANCELLED");

        var last24h = await baseQ.CountAsync(x => x.CreatedAt >= now.AddHours(-24));
        var todayUtc = await baseQ.CountAsync(x => x.CreatedAt >= now.Date);

        var windowQ = baseQ.Where(x => x.CreatedAt >= start && x.CreatedAt < end);

        var raw = await windowQ
            .Select(x => new { x.CreatedAt, x.Status })
            .ToListAsync();

        var daily = raw
            .GroupBy(x => x.CreatedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g => new SosDailyCount
            {
                DateUtc = g.Key.ToString("yyyy-MM-dd"),
                Total = g.Count(),
                Pending = g.Count(x => x.Status == "PENDING"),
                Accepted = g.Count(x => x.Status == "ACCEPTED"),
                Rescued = g.Count(x => x.Status == "RESCUED"),
                Cancelled = g.Count(x => x.Status == "CANCELLED"),
            })
            .ToList();

        var resp = new SosStatsResponse
        {
            Total = total,
            Pending = pending,
            Accepted = accepted,
            Rescued = rescued,
            Cancelled = cancelled,
            Active = pending + accepted,
            Last24h = last24h,
            TodayUtc = todayUtc,
            Daily = daily
        };

        return Ok(resp);
    }

    // GET /api/reports/sos/export?days=7&status=ACTIVE
    // GET /api/reports/sos/export?from=2025-12-01&to=2025-12-31&status=PENDING
    [HttpGet("sos/export")]
    public async Task<IActionResult> SosExport(
        [FromQuery] int? days = null,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] string? status = null
    )
    {
        var q = _db.SosRequests.AsNoTracking().AsQueryable();

        // lọc theo ngày
        if (days.HasValue)
        {
            var d = Math.Clamp(days.Value, 1, 90);
            var start = DateTime.UtcNow.Date.AddDays(-(d - 1));
            var end = DateTime.UtcNow.Date.AddDays(1);
            q = q.Where(x => x.CreatedAt >= start && x.CreatedAt < end);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(from))
            {
                if (DateTime.TryParseExact(from, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var f))
                {
                    q = q.Where(x => x.CreatedAt >= f.Date);
                }
            }

            if (!string.IsNullOrWhiteSpace(to))
            {
                if (DateTime.TryParseExact(to, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var t))
                {
                    // inclusive "to" => < to+1
                    q = q.Where(x => x.CreatedAt < t.Date.AddDays(1));
                }
            }
        }

        // lọc status
        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToUpperInvariant();
            if (st == "ACTIVE")
            {
                q = q.Where(x => x.Status == "PENDING" || x.Status == "ACCEPTED");
            }
            else
            {
                q = q.Where(x => x.Status == st);
            }
        }

        var list = await q.OrderByDescending(x => x.CreatedAt).ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Id,UserId,RescuerId,Latitude,Longitude,Status,CreatedAt,AcceptedAt,RescuedAt,CancelledAt,UpdatedAt");

        foreach (var s in list)
        {
            sb.AppendLine(string.Join(",",
                Csv(s.Id),
                Csv(s.UserId),
                Csv(s.RescuerId),
                Csv(s.Latitude),
                Csv(s.Longitude),
                Csv(s.Status),
                Csv(s.CreatedAt),
                Csv(s.AcceptedAt),
                Csv(s.RescuedAt),
                Csv(s.CancelledAt),
                Csv(s.UpdatedAt)
            ));
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"sos_report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private static string Csv(object? v)
    {
        if (v == null) return "\"\"";
        var s = v switch
        {
            null => "",
            DateTime dt => dt.ToString("O"),
            DateTimeOffset dto => dto.ToString("O"),
            _ => v?.ToString() ?? ""
        };

        // escape "
        s = s.Replace("\"", "\"\"");
        return $"\"{s}\"";
    }
}
