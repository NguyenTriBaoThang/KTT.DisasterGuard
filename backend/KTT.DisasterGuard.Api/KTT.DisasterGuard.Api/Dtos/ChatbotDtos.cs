using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Dtos;

public class ChatAskRequest
{
    [Required, MaxLength(1000)]
    public string Message { get; set; } = string.Empty;
}

public class ChatAskResponse
{
    public string Reply { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class ChatHistoryItem
{
    public string Sender { get; set; } = "USER";
    public string Message { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
