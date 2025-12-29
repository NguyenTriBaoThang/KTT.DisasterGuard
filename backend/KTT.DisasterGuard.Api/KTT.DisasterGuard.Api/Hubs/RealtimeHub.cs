using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace KTT.DisasterGuard.Api.Hubs;

[Authorize]
public class RealtimeHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var role = (Context.User?.FindFirstValue(ClaimTypes.Role) ?? "").ToUpperInvariant();

        // Group cho RESCUE/ADMIN
        if (role == "RESCUE" || role == "ADMIN")
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "rescue");
        }

        // Group cho tất cả
        await Groups.AddToGroupAsync(Context.ConnectionId, "all");

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "rescue");
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "all");
        await base.OnDisconnectedAsync(exception);
    }
}