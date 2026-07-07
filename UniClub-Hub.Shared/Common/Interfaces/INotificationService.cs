using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Common.Interfaces
{
   public interface INotificationService
    {
        Task SendAsync(
            string userId,
            string title,
            string message,
            NotificationType type = NotificationType.System,
            string? link = null,
            string? body = null,
            string? relatedEntityType = null,
            int? relatedEntityId = null);
    }
}