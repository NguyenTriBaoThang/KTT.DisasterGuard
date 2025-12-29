using System.Security.Claims;

namespace KTT.DisasterGuard.Api.Helpers;

public static class ClaimHelper
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var v =
            user.FindFirstValue(ClaimTypes.NameIdentifier) ??
            user.FindFirstValue("sub") ??
            user.FindFirstValue(ClaimTypes.Name);

        if (Guid.TryParse(v, out var id)) return id;

        throw new UnauthorizedAccessException("Invalid user id claim.");
    }
}
