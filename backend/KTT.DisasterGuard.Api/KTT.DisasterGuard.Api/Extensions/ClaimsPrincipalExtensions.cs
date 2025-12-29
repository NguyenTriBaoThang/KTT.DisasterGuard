using System.Security.Claims;

namespace KTT.DisasterGuard.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static bool TryGetUserId(this ClaimsPrincipal user, out Guid userId)
    {
        userId = Guid.Empty;

        var raw =
            user.FindFirstValue(ClaimTypes.NameIdentifier) ??
            user.FindFirstValue("sub") ??
            user.FindFirstValue(ClaimTypes.Name);

        return Guid.TryParse(raw, out userId);
    }
}
