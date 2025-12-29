using System.Security.Claims;
using KTT.DisasterGuard.Api.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace KTT.DisasterGuard.Api.Hubs;

[Authorize]
public class RealtimeHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        // group theo user để gửi riêng
        var userId = Context.User?.GetUserId();
        if (userId != null && userId != Guid.Empty)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
        }

        // group cứu hộ để broadcast SOS/Location
        var role = (Context.User?.FindFirstValue(ClaimTypes.Role) ?? "").ToUpperInvariant();
        if (role == "ADMIN" || role == "RESCUE")
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "rescue");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.GetUserId();
        if (userId != null && userId != Guid.Empty)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user:{userId}");
        }

        var role = (Context.User?.FindFirstValue(ClaimTypes.Role) ?? "").ToUpperInvariant();
        if (role == "ADMIN" || role == "RESCUE")
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "rescue");
        }

        await base.OnDisconnectedAsync(exception);
    }
}
