using Microsoft.AspNetCore.SignalR;
using UniClub_Hub.Server.Hubs;
using UniClub_Hub.Shared.Common.Interfaces;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Server.Services;

/// <summary>
/// Sends per-user in-app notifications over the existing KanbanHub connection.
/// Relies on SignalR's default IUserIdProvider, which maps a connection to the
/// JWT NameIdentifier claim (= ApplicationUser.Id = Notification.UserId).
/// </summary>
public class RealtimeNotifier(IHubContext<KanbanHub> hubContext) : IRealtimeNotifier
{
    public Task NotifyUserAsync(string userId, object payload) =>
        hubContext.Clients
            .User(userId)
            .SendAsync(SignalREvents.NotificationReceived, payload);
}
