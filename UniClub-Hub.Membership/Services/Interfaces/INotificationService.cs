using UniClub_Hub.Membership.DTOs.Notification;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface INotificationService
    {
        Task SendAsync(string userId, string title, string message, NotificationType type = NotificationType.System,
            string? body = null, string? relatedEntityType = null, int? relatedEntityId = null);
        Task<PagedResult<NotificationDto>> GetMyNotificationsAsync(string userId, int page, int pageSize);
        Task<int> GetUnreadCountAsync(string userId);
        Task MarkAsReadAsync(int id, string userId);
        Task MarkAllAsReadAsync(string userId);
        Task DeleteAsync(int id, string userId);
    }
}
