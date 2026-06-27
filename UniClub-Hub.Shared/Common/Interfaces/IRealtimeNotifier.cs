namespace UniClub_Hub.Shared.Common.Interfaces
{
    /// <summary>
    /// Pushes a realtime payload to a single user's connections.
    /// Implemented in the Server project (over SignalR) so module services
    /// can publish without referencing the Hub directly.
    /// </summary>
    public interface IRealtimeNotifier
    {
        Task NotifyUserAsync(string userId, object payload);
    }
}
