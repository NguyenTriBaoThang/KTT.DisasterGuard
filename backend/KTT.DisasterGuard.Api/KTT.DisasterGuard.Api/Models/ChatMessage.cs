using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Models;

public class ChatMessage
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    // USER | AI
    [MaxLength(10)]
    public string Sender { get; set; } = "USER";

    [MaxLength(2000)]
    public string Message { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
