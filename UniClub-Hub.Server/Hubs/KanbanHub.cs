using Microsoft.AspNetCore.SignalR;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Server.Hubs;

public class KanbanHub : Hub
{
    public async Task JoinClub(int clubId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, SignalRGroups.Club(clubId));

    public async Task LeaveClub(int clubId) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, SignalRGroups.Club(clubId));
}
