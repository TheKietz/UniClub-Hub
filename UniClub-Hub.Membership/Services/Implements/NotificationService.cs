using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Notification;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class NotificationService : INotificationService
    {
        private readonly UniClubDbContext _db;

        public NotificationService(UniClubDbContext db)
        {
            _db = db;
        }

        public async Task SendAsync(string userId, string title, string message, string type = "System")
        {
            _db.Notifications.Add(new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }

        public async Task<PagedResult<NotificationDto>> GetMyNotificationsAsync(string userId, int page, int pageSize)
        {
            var query = _db.Notifications
                .Where(n => n.UserId == userId)
                .OrderBy(n => n.IsRead)
                .ThenByDescending(n => n.CreatedAt);

            var total = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    Type = n.Type,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();

            return new PagedResult<NotificationDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task MarkAsReadAsync(int id, string userId)
        {
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId)
                ?? throw new KeyNotFoundException("Không tìm thấy thông báo.");

            notification.IsRead = true;
            await _db.SaveChangesAsync();
        }

        public async Task MarkAllAsReadAsync(string userId)
        {
            await _db.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        }

        public async Task DeleteAsync(int id, string userId)
        {
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId)
                ?? throw new KeyNotFoundException("Không tìm thấy thông báo.");

            _db.Notifications.Remove(notification);
            await _db.SaveChangesAsync();
        }
    }
}
