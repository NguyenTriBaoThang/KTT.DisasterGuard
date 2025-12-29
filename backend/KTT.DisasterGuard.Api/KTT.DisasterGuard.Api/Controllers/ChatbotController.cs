using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Dtos;
using KTT.DisasterGuard.Api.Extensions;
using KTT.DisasterGuard.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KTT.DisasterGuard.Api.Controllers;

[ApiController]
[Route("api/chatbot")]
[Authorize] // cần đăng nhập để lưu lịch sử
public class ChatbotController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChatbotController(AppDbContext db)
    {
        _db = db;
    }

    // POST /api/chatbot/ask
    [HttpPost("ask")]
    public async Task<IActionResult> Ask(ChatAskRequest req)
    {
        if (!User.TryGetUserId(out var userId))
            return Unauthorized("Missing/invalid user id claim.");

        var text = (req.Message ?? "").Trim();
        if (string.IsNullOrWhiteSpace(text))
            return BadRequest("Message is required.");

        var reply = GenerateEmergencyReply(text);

        // lưu lịch sử: USER -> AI
        _db.ChatMessages.Add(new ChatMessage
        {
            UserId = userId,
            Sender = "USER",
            Message = text,
            CreatedAt = DateTime.UtcNow
        });

        _db.ChatMessages.Add(new ChatMessage
        {
            UserId = userId,
            Sender = "AI",
            Message = reply,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new ChatAskResponse
        {
            Reply = reply,
            CreatedAtUtc = DateTime.UtcNow
        });
    }

    // GET /api/chatbot/history?limit=50
    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] int limit = 50)
    {
        if (!User.TryGetUserId(out var userId))
            return Unauthorized("Missing/invalid user id claim.");

        limit = Math.Clamp(limit, 1, 200);

        var list = await _db.ChatMessages
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .OrderBy(x => x.CreatedAt)
            .Select(x => new ChatHistoryItem
            {
                Sender = x.Sender,
                Message = x.Message,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // ====== MOCK "AI" (rule-based) để demo theo proposal ======
    private static string GenerateEmergencyReply(string input)
    {
        var s = input.ToLowerInvariant();

        bool isFlood = s.Contains("lũ") || s.Contains("ngập") || s.Contains("flood");
        bool isStorm = s.Contains("bão") || s.Contains("gió") || s.Contains("storm");
        bool isLandslide = s.Contains("sạt lở") || s.Contains("landslide");

        // gợi ý chung
        var common =
            "✅ Hướng dẫn nhanh:\n" +
            "• Giữ bình tĩnh, ưu tiên an toàn tính mạng.\n" +
            "• Nếu nguy hiểm, bấm SOS và chia sẻ vị trí.\n" +
            "• Chuẩn bị: nước, đèn pin, sạc, giấy tờ quan trọng.\n" +
            "• Tránh khu vực bị phong tỏa/cảnh báo.\n";

        if (isFlood)
        {
            return common +
                   "🌊 Trường hợp LŨ/NGẬP:\n" +
                   "• Di chuyển lên nơi cao, tránh dòng nước chảy xiết.\n" +
                   "• Không lội/đi xe qua chỗ nước sâu (khó ước lượng độ sâu).\n" +
                   "• Tắt nguồn điện khu vực bị ngập nếu có thể làm an toàn.\n";
        }

        if (isStorm)
        {
            return common +
                   "🌪️ Trường hợp BÃO/GIÓ LỚN:\n" +
                   "• Ở trong nhà, tránh cửa kính, gia cố cửa sổ.\n" +
                   "• Không đứng gần cây lớn/cột điện/bảng hiệu.\n" +
                   "• Theo dõi cảnh báo thời tiết địa phương và hướng dẫn sơ tán.\n";
        }

        if (isLandslide)
        {
            return common +
                   "⛰️ Trường hợp SẠT LỞ:\n" +
                   "• Tránh sườn dốc, taluy, khu vực đất đá nứt/rụng.\n" +
                   "• Nếu thấy dấu hiệu bất thường (nứt tường, rung lắc), rời khỏi khu vực ngay.\n" +
                   "• Không quay lại cho đến khi có thông báo an toàn.\n";
        }

        return common +
               "Bạn đang gặp tình huống nào? (lũ/bão/sạt lở) — mô tả ngắn để mình hướng dẫn cụ thể hơn.";
    }
}
