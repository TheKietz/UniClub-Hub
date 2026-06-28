using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface IContributionAwardService
    {
        Task AwardTaskCompletionAsync(ClubTask task, CancellationToken cancellationToken = default);
        Task ReverseTaskAsync(int taskId, CancellationToken cancellationToken = default);
        Task AwardEventCheckInAsync(int eventId, string userId, CancellationToken cancellationToken = default);
        Task ReverseEventCheckInAsync(int eventId, string userId, CancellationToken cancellationToken = default);
    }
}
