using UniClub_Hub.Membership.DTOs.Notification;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface INotificationService
    {
        Task SendAsync(string userId, string title, string message, string type = "System");
        Task<PagedResult<NotificationDto>> GetMyNotificationsAsync(string userId, int page, int pageSize);
        Task MarkAsReadAsync(int id, string userId);
        Task MarkAllAsReadAsync(string userId);
        Task DeleteAsync(int id, string userId);
    }
}
