using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Notification;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Common.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class NotificationService : UniClub_Hub.Membership.Services.Interfaces.INotificationService,
                                       UniClub_Hub.Shared.Common.Interfaces.INotificationService
    {
        private readonly UniClubDbContext _db;
        private readonly IRealtimeNotifier _realtime;

        public NotificationService(UniClubDbContext db, IRealtimeNotifier realtime)
        {
            _db = db;
            _realtime = realtime;
        }

        public async Task SendAsync(string userId, string title, string message,
            NotificationType type = NotificationType.System,
            string? body = null, string? relatedEntityType = null, int? relatedEntityId = null)
        {
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                CreatedAt = DateTime.UtcNow,
                Body = body,
                RelatedEntityType = relatedEntityType,
                RelatedEntityId = relatedEntityId,
            };
            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();

            // Realtime push — never let a delivery failure break the caller's flow.
            try
            {
                await _realtime.NotifyUserAsync(userId, new
                {
                    id = notification.Id,
                    title,
                    message,
                    type = type.ToString(),
                    navigationUrl = await ResolveNavigationUrlAsync(relatedEntityType, relatedEntityId),
                });
            }
            catch
            {
                // Notification is already persisted; the poll/refresh path will surface it.
            }
        }

        // Resolves the in-app deep-link for a notification's related entity. The entity
        // id alone isn't enough — we look it up to obtain club/department context so the
        // URL matches the app's real (club-scoped) routes. Only Task & Assignment are
        // produced by current triggers.
        private async Task<string?> ResolveNavigationUrlAsync(string? entityType, int? entityId)
        {
            if (entityId is null) return null;
            switch (entityType)
            {
                case "Task":
                    var t = await _db.Tasks.AsNoTracking()
                        .Where(x => x.Id == entityId)
                        .Select(x => new { x.ClubId, x.DepartmentId })
                        .FirstOrDefaultAsync();
                    return t is null ? null : BuildTaskUrl(t.ClubId, t.DepartmentId);

                case "Assignment":
                    var aClubId = await _db.EventClubAssignments.AsNoTracking()
                        .Where(x => x.Id == entityId)
                        .Select(x => (int?)x.ClubId)
                        .FirstOrDefaultAsync();
                    return aClubId is null ? null : $"/clubs/{aClubId}/manage/inbox";

                default:
                    return null;
            }
        }

        private static string BuildTaskUrl(int clubId, int? departmentId) =>
            departmentId.HasValue
                ? $"/clubs/{clubId}/operations?view=sprints&dept={departmentId}"
                : $"/clubs/{clubId}/operations?view=sprints";

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
                    CreatedAt = n.CreatedAt,
                    Body = n.Body,
                    RelatedEntityType = n.RelatedEntityType,
                    RelatedEntityId = n.RelatedEntityId,
                })
                .ToListAsync();

            // Resolve deep-links in batches to avoid N+1 (only Task & Assignment exist today).
            var taskIds = items.Where(i => i.RelatedEntityType == "Task" && i.RelatedEntityId != null)
                .Select(i => i.RelatedEntityId!.Value).Distinct().ToList();
            var assignmentIds = items.Where(i => i.RelatedEntityType == "Assignment" && i.RelatedEntityId != null)
                .Select(i => i.RelatedEntityId!.Value).Distinct().ToList();

            var taskUrls = (await _db.Tasks.AsNoTracking()
                    .Where(t => taskIds.Contains(t.Id))
                    .Select(t => new { t.Id, t.ClubId, t.DepartmentId })
                    .ToListAsync())
                .ToDictionary(t => t.Id, t => BuildTaskUrl(t.ClubId, t.DepartmentId));
            var assignmentClubIds = (await _db.EventClubAssignments.AsNoTracking()
                    .Where(a => assignmentIds.Contains(a.Id))
                    .Select(a => new { a.Id, a.ClubId })
                    .ToListAsync())
                .ToDictionary(a => a.Id, a => a.ClubId);

            foreach (var item in items)
            {
                if (item.RelatedEntityId is not int rid) continue;
                item.NavigationUrl = item.RelatedEntityType switch
                {
                    "Task" => taskUrls.GetValueOrDefault(rid),
                    "Assignment" => assignmentClubIds.TryGetValue(rid, out var cid) ? $"/clubs/{cid}/manage/inbox" : null,
                    _ => null,
                };
            }

            return new PagedResult<NotificationDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<int> GetUnreadCountAsync(string userId)
        {
            return await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
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
