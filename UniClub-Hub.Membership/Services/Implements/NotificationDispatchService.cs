using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class NotificationDispatchService : INotificationDispatchService
    {
        private readonly UniClubDbContext _db;
        private readonly INotificationService _notifications;

        public NotificationDispatchService(UniClubDbContext db, INotificationService notifications)
        {
            _db = db;
            _notifications = notifications;
        }

        public async Task FireAsync(string triggerKey, int? clubId, Dictionary<string, string> context)
        {
            var prefs = await LoadPreferencesAsync(triggerKey, clubId);

            foreach (var pref in prefs)
            {
                if (!pref.InAppEnabled) continue;

                var userIds = await ResolveUserIdsAsync(pref.RecipientRole, clubId, context);
                if (userIds.Count == 0) continue;

                var template = pref.InAppTemplate ?? GetDefaultInAppTemplate(triggerKey, pref.RecipientRole);
                var message = ApplyTemplate(template, context);
                var title = GetTitle(triggerKey);
                var link = GetLink(triggerKey, pref.RecipientRole, clubId);

                var notifType = GetNotificationType(triggerKey);
                foreach (var uid in userIds)
                    await _notifications.SendAsync(uid, title, message, notifType, link);
            }
        }

        public async Task<bool> IsEmailEnabledAsync(string triggerKey, string recipientRole, int? clubId)
        {
            // Try club-specific first, then global
            var pref = clubId.HasValue
                ? await _db.NotificationPreferences.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ClubId == clubId && p.TriggerKey == triggerKey && p.RecipientRole == recipientRole)
                  ?? await _db.NotificationPreferences.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ClubId == null && p.TriggerKey == triggerKey && p.RecipientRole == recipientRole)
                : await _db.NotificationPreferences.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ClubId == null && p.TriggerKey == triggerKey && p.RecipientRole == recipientRole);

            return pref?.EmailEnabled ?? false;
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private async Task<List<NotificationPreference>> LoadPreferencesAsync(string triggerKey, int? clubId)
        {
            if (!clubId.HasValue)
                return await _db.NotificationPreferences.AsNoTracking()
                    .Where(p => p.ClubId == null && p.TriggerKey == triggerKey)
                    .ToListAsync();

            // Club-specific prefs; for any role not overridden, fall back to global
            var clubPrefs = await _db.NotificationPreferences.AsNoTracking()
                .Where(p => p.ClubId == clubId && p.TriggerKey == triggerKey)
                .ToListAsync();

            var globalPrefs = await _db.NotificationPreferences.AsNoTracking()
                .Where(p => p.ClubId == null && p.TriggerKey == triggerKey)
                .ToListAsync();

            // Merge: club-specific wins per RecipientRole
            var overriddenRoles = clubPrefs.Select(p => p.RecipientRole).ToHashSet();
            var result = new List<NotificationPreference>(clubPrefs);
            result.AddRange(globalPrefs.Where(g => !overriddenRoles.Contains(g.RecipientRole)));
            return result;
        }

        private async Task<List<string>> ResolveUserIdsAsync(
            string recipientRole, int? clubId, Dictionary<string, string> context)
        {
            return recipientRole switch
            {
                NotificationRecipientRoles.TargetUser =>
                    context.TryGetValue("targetUserId", out var uid) ? [uid] : [],

                NotificationRecipientRoles.Applicant =>
                    context.TryGetValue("applicantUserId", out var aid) ? [aid] : [],

                NotificationRecipientRoles.ClubAdmin when clubId.HasValue =>
                    await _db.ClubMemberships
                        .Where(m => m.ClubId == clubId
                            && m.ClubRole == ClubRole.CLUB_ADMIN
                            && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                        .Select(m => m.UserId).ToListAsync(),

                NotificationRecipientRoles.DeptLead when clubId.HasValue =>
                    await _db.ClubMemberships
                        .Where(m => m.ClubId == clubId
                            && m.ClubRole == ClubRole.DEPT_LEAD
                            && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                        .Select(m => m.UserId).ToListAsync(),

                NotificationRecipientRoles.AllMembers when clubId.HasValue =>
                    await _db.ClubMemberships
                        .Where(m => m.ClubId == clubId
                            && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                        .Select(m => m.UserId).ToListAsync(),

                NotificationRecipientRoles.SuperAdmin =>
                    await _db.UserRoles
                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, r.Name })
                        .Where(x => x.Name == "SUPER_ADMIN")
                        .Select(x => x.UserId).ToListAsync(),

                _ => []
            };
        }

        private static string ApplyTemplate(string template, Dictionary<string, string> context)
        {
            foreach (var (k, v) in context)
                template = template.Replace("{{" + k + "}}", v);
            return template;
        }

        private static string GetTitle(string triggerKey) =>
            NotificationTriggers.Meta.TryGetValue(triggerKey, out var meta) ? meta.Label : "Thông báo";

        private static string? GetLink(string triggerKey, string recipientRole, int? clubId)
        {
            if (!clubId.HasValue) return null;
            var cid = clubId.Value;
            return triggerKey switch
            {
                NotificationTriggers.ApplicationSubmitted => $"/clubs/{cid}/manage/applications",
                NotificationTriggers.ApplicationInterview => $"/clubs/{cid}",
                NotificationTriggers.ApplicationAccepted  => $"/clubs/{cid}",
                NotificationTriggers.ApplicationRejected  => $"/clubs/{cid}",
                NotificationTriggers.ResignationSubmitted => $"/clubs/{cid}/manage/resignations",
                NotificationTriggers.ResignationReviewed  => $"/clubs/{cid}",
                NotificationTriggers.TaskAssigned         => $"/clubs/{cid}/operations",
                NotificationTriggers.TaskDeadlineSoon     => $"/clubs/{cid}/operations",
                NotificationTriggers.TaskStatusChanged    => $"/clubs/{cid}/operations",
                NotificationTriggers.EventCreated         => $"/clubs/{cid}/manage/events",
                NotificationTriggers.EventReminder        => $"/clubs/{cid}/manage/events",
                NotificationTriggers.MemberAdded          => $"/clubs/{cid}",
                NotificationTriggers.MemberRoleChanged    => $"/clubs/{cid}",
                NotificationTriggers.MemberRemoved        => $"/clubs/{cid}",
                _ => null
            };
        }

        private static string GetDefaultInAppTemplate(string triggerKey, string recipientRole) => triggerKey switch
        {
            NotificationTriggers.ApplicationSubmitted => "Có đơn đăng ký mới từ {{userName}} vào {{clubName}}.",
            NotificationTriggers.ApplicationInterview => "CLB {{clubName}} mời bạn tham gia phỏng vấn.",
            NotificationTriggers.ApplicationAccepted  => "Chúc mừng! Bạn đã được chấp nhận vào {{clubName}}.",
            NotificationTriggers.ApplicationRejected  => "Đơn đăng ký vào {{clubName}} của bạn chưa được chấp nhận lần này.",
            NotificationTriggers.MemberAdded          => "Bạn đã được thêm vào {{clubName}} với vai trò {{role}}.",
            NotificationTriggers.MemberRoleChanged    => "Vai trò của bạn trong {{clubName}} đã được đổi thành {{newRole}}.",
            NotificationTriggers.MemberRemoved        => "Bạn đã bị xóa khỏi {{clubName}}.",
            NotificationTriggers.ResignationSubmitted => "{{userName}} đã gửi đơn từ chức tại {{clubName}}.",
            NotificationTriggers.ResignationReviewed  => "Đơn từ chức của bạn tại {{clubName}} đã được {{status}}.",
            NotificationTriggers.TaskAssigned         => "Bạn được giao task '{{taskName}}' trong {{clubName}}.",
            NotificationTriggers.TaskDeadlineSoon     => "Task '{{taskName}}' sắp đến deadline ({{deadline}}).",
            NotificationTriggers.TaskStatusChanged    => "Task '{{taskName}}' đã chuyển sang trạng thái {{newStatus}}.",
            NotificationTriggers.EventCreated         => "Sự kiện mới '{{eventName}}' đã được tạo trong {{clubName}}.",
            NotificationTriggers.EventReminder        => "Nhắc lịch: sự kiện '{{eventName}}' diễn ra vào {{eventDate}}.",
            NotificationTriggers.SystemAnnouncement   => "{{message}}",
            _ => "Bạn có thông báo mới.",
        };

        private static NotificationType GetNotificationType(string triggerKey) => triggerKey switch
        {
            NotificationTriggers.ApplicationSubmitted or
            NotificationTriggers.ApplicationInterview or
            NotificationTriggers.ApplicationAccepted  or
            NotificationTriggers.ApplicationRejected  => NotificationType.Application,

            NotificationTriggers.TaskAssigned         or
            NotificationTriggers.TaskDeadlineSoon     or
            NotificationTriggers.TaskStatusChanged    => NotificationType.Task,

            NotificationTriggers.EventCreated         or
            NotificationTriggers.EventReminder        => NotificationType.Event,

            _ => NotificationType.System,
        };
    }
}
