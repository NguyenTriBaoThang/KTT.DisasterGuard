using System.ComponentModel.DataAnnotations;

namespace KTT.DisasterGuard.Api.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    // USER | RESCUE | ADMIN
    [MaxLength(20)]
    public string Role { get; set; } = "USER";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
