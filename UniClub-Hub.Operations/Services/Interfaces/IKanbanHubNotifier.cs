namespace UniClub_Hub.Operations.Services.Interfaces;

public interface IKanbanHubNotifier
{
    Task NotifyEventTasksCleanedAsync(int clubId, int eventId);
}
