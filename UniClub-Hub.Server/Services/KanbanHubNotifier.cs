using Microsoft.AspNetCore.SignalR;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Server.Hubs;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Server.Services;

public class KanbanHubNotifier(IHubContext<KanbanHub> hubContext) : IKanbanHubNotifier
{
    public async Task NotifyEventTasksCleanedAsync(int clubId, int eventId) =>
        await hubContext.Clients
            .Group(SignalRGroups.Club(clubId))
            .SendAsync(SignalREvents.EventTasksCleaned, clubId, eventId);
}
