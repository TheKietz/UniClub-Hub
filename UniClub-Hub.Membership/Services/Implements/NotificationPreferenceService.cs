using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.NotificationPreference;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class NotificationPreferenceService : INotificationPreferenceService
    {
        private readonly UniClubDbContext _db;
        private readonly IClubPermissionService _permissions;
        private readonly INotificationService _notifications;

        public NotificationPreferenceService(
            UniClubDbContext db,
            IClubPermissionService permissions,
            INotificationService notifications)
        {
            _db = db;
            _permissions = permissions;
            _notifications = notifications;
        }

        public async Task<IEnumerable<NotificationPreferenceDto>> GetGlobalAsync()
        {
            var saved = await _db.NotificationPreferences.AsNoTracking()
                .Where(p => p.ClubId == null)
                .ToListAsync();

            return BuildFullList(saved, isOverride: false);
        }

        public async Task<IEnumerable<NotificationPreferenceDto>> GetForClubAsync(int clubId)
        {
            var clubPrefs = await _db.NotificationPreferences.AsNoTracking()
                .Where(p => p.ClubId == clubId)
                .ToListAsync();

            var globalPrefs = await _db.NotificationPreferences.AsNoTracking()
                .Where(p => p.ClubId == null)
                .ToListAsync();

            var result = new List<NotificationPreferenceDto>();
            foreach (var (trigger, role, defInApp, defEmail) in DefaultMatrix())
            {
                var club = clubPrefs.FirstOrDefault(p => p.TriggerKey == trigger && p.RecipientRole == role);
                var global = globalPrefs.FirstOrDefault(p => p.TriggerKey == trigger && p.RecipientRole == role);
                result.Add(ToDto(
                    trigger,
                    role,
                    club ?? global,
                    isOverride: club != null,
                    defInApp,
                    defEmail,
                    global));
            }
            return result;
        }

        public async Task UpsertGlobalAsync(string triggerKey, string recipientRole,
            UpdateNotificationPreferenceDto dto, string updatedBy)
        {
            var (defInApp, defEmail) = GetDefaults(triggerKey, recipientRole);

            var existing = await _db.NotificationPreferences
                .FirstOrDefaultAsync(p => p.ClubId == null && p.TriggerKey == triggerKey && p.RecipientRole == recipientRole);

            var prevInApp = existing?.InAppEnabled ?? defInApp;
            var prevEmail = existing?.EmailEnabled ?? defEmail;

            if (existing == null)
            {
                _db.NotificationPreferences.Add(new NotificationPreference
                {
                    ClubId = null, TriggerKey = triggerKey, RecipientRole = recipientRole,
                    InAppEnabled = dto.InAppEnabled, EmailEnabled = dto.EmailEnabled,
                    InAppTemplate = dto.InAppTemplate, EmailSubject = dto.EmailSubject, EmailTemplate = dto.EmailTemplate,
                });
            }
            else
            {
                existing.InAppEnabled  = dto.InAppEnabled;
                existing.EmailEnabled  = dto.EmailEnabled;
                existing.InAppTemplate = dto.InAppTemplate;
                existing.EmailSubject  = dto.EmailSubject;
                existing.EmailTemplate = dto.EmailTemplate;
            }
            await _db.SaveChangesAsync();

            if (dto.InAppEnabled != prevInApp || dto.EmailEnabled != prevEmail)
            {
                await NotifyClubAdminsOfGlobalPolicyChangeAsync(
                    triggerKey, recipientRole, dto.InAppEnabled, dto.EmailEnabled);
            }
        }

        public async Task UpsertClubAsync(int clubId, string triggerKey, string recipientRole,
            UpdateNotificationPreferenceDto dto, string requesterUserId, bool isSuperAdmin)
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId,
                requesterUserId,
                isSuperAdmin,
                ClubPermissions.NotificationSettingsManage);

            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var existing = await _db.NotificationPreferences
                .FirstOrDefaultAsync(p => p.ClubId == clubId && p.TriggerKey == triggerKey && p.RecipientRole == recipientRole);

            if (existing == null)
            {
                _db.NotificationPreferences.Add(new NotificationPreference
                {
                    ClubId = clubId, TriggerKey = triggerKey, RecipientRole = recipientRole,
                    InAppEnabled = dto.InAppEnabled, EmailEnabled = dto.EmailEnabled,
                    InAppTemplate = dto.InAppTemplate, EmailSubject = dto.EmailSubject, EmailTemplate = dto.EmailTemplate,
                });
            }
            else
            {
                existing.InAppEnabled  = dto.InAppEnabled;
                existing.EmailEnabled  = dto.EmailEnabled;
                existing.InAppTemplate = dto.InAppTemplate;
                existing.EmailSubject  = dto.EmailSubject;
                existing.EmailTemplate = dto.EmailTemplate;
            }
            await _db.SaveChangesAsync();
        }

        public async Task ResetClubAsync(
            int clubId,
            string triggerKey,
            string recipientRole,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId,
                requesterUserId,
                isSuperAdmin,
                ClubPermissions.NotificationSettingsManage);

            var existing = await _db.NotificationPreferences
                .FirstOrDefaultAsync(p => p.ClubId == clubId && p.TriggerKey == triggerKey && p.RecipientRole == recipientRole);

            if (existing != null)
            {
                _db.NotificationPreferences.Remove(existing);
                await _db.SaveChangesAsync();
            }
        }

        private async Task NotifyClubAdminsOfGlobalPolicyChangeAsync(
            string triggerKey,
            string recipientRole,
            bool newInApp,
            bool newEmail)
        {
            var clubsWithOverride = (await _db.NotificationPreferences
                .AsNoTracking()
                .Where(p => p.ClubId != null && p.TriggerKey == triggerKey && p.RecipientRole == recipientRole)
                .Select(p => p.ClubId!.Value)
                .ToListAsync())
                .ToHashSet();

            var clubIds = await _db.Clubs
                .AsNoTracking()
                .Where(c => c.Status == ClubStatus.Active)
                .Select(c => c.Id)
                .ToListAsync();

            var targetClubIds = clubIds.Where(id => !clubsWithOverride.Contains(id)).ToList();
            if (targetClubIds.Count == 0)
                return;

            var admins = await _db.ClubMemberships
                .AsNoTracking()
                .Where(m => targetClubIds.Contains(m.ClubId)
                    && m.ClubRole == ClubRole.CLUB_ADMIN
                    && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                .Select(m => new { m.ClubId, m.UserId })
                .ToListAsync();

            if (admins.Count == 0)
                return;

            NotificationTriggers.Meta.TryGetValue(triggerKey, out var meta);
            NotificationRecipientRoles.Labels.TryGetValue(recipientRole, out var roleLabel);
            var triggerLabel = meta.Label ?? triggerKey;
            var inAppText = newInApp ? "bật" : "tắt";
            var emailText = newEmail ? "bật" : "tắt";
            var message =
                $"Cấu hình thông báo hệ thống vừa cập nhật: {triggerLabel} → {roleLabel ?? recipientRole} " +
                $"(In-app: {inAppText}, Email: {emailText}). " +
                "Bạn có thể bật lại riêng cho CLB tại Cài đặt thông báo nếu cần.";

            foreach (var admin in admins)
            {
                await _notifications.SendAsync(
                    admin.UserId,
                    "Cập nhật cấu hình thông báo hệ thống",
                    message,
                    NotificationType.System,
                    relatedEntityType: "Club",
                    relatedEntityId: admin.ClubId);
            }
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private static IEnumerable<NotificationPreferenceDto> BuildFullList(
            List<NotificationPreference> saved, bool isOverride)
        {
            foreach (var (trigger, role, defInApp, defEmail) in DefaultMatrix())
            {
                var pref = saved.FirstOrDefault(p => p.TriggerKey == trigger && p.RecipientRole == role);
                yield return ToDto(trigger, role, pref, isOverride, defInApp, defEmail);
            }
        }

        private static NotificationPreferenceDto ToDto(
            string trigger,
            string role,
            NotificationPreference? pref,
            bool isOverride,
            bool defaultInApp = true,
            bool defaultEmail = false,
            NotificationPreference? globalPref = null)
        {
            NotificationTriggers.Meta.TryGetValue(trigger, out var meta);
            NotificationRecipientRoles.Labels.TryGetValue(role, out var roleLabel);
            var globalInApp = globalPref?.InAppEnabled ?? defaultInApp;
            var globalEmail = globalPref?.EmailEnabled ?? defaultEmail;

            return new()
            {
                TriggerKey          = trigger,
                TriggerLabel        = meta.Label    ?? trigger,
                TriggerCategory     = meta.Category ?? "",
                RecipientRole       = role,
                RecipientRoleLabel  = roleLabel ?? role,
                InAppEnabled        = pref?.InAppEnabled  ?? defaultInApp,
                EmailEnabled        = pref?.EmailEnabled  ?? defaultEmail,
                InAppTemplate       = pref?.InAppTemplate,
                EmailSubject        = pref?.EmailSubject,
                EmailTemplate       = pref?.EmailTemplate,
                IsOverride          = isOverride,
                GlobalInAppEnabled  = globalInApp,
                GlobalEmailEnabled  = globalEmail,
            };
        }

        private static (bool inApp, bool email) GetDefaults(string triggerKey, string recipientRole)
        {
            foreach (var (trigger, role, inApp, email) in DefaultMatrix())
            {
                if (trigger == triggerKey && role == recipientRole)
                    return (inApp, email);
            }
            return (true, false);
        }

        /// <summary>
        /// Canonical (trigger, role, defaultInApp, defaultEmail) matrix.
        /// Pairs with defaultInApp=false are opt-in: visible in UI but disabled unless admin enables.
        /// </summary>
        private static IEnumerable<(string trigger, string role, bool inApp, bool email)> DefaultMatrix() =>
        [
            // ── Tuyển thành viên ────────────────────────────────────────────
            (NotificationTriggers.ApplicationSubmitted, NotificationRecipientRoles.ClubAdmin,  true,  false),
            (NotificationTriggers.ApplicationSubmitted, NotificationRecipientRoles.DeptLead,   false, false),
            (NotificationTriggers.ApplicationInterview, NotificationRecipientRoles.TargetUser, true,  true),
            (NotificationTriggers.ApplicationInterview, NotificationRecipientRoles.ClubAdmin,  false, false),
            (NotificationTriggers.ApplicationAccepted,  NotificationRecipientRoles.TargetUser, true,  true),
            (NotificationTriggers.ApplicationAccepted,  NotificationRecipientRoles.ClubAdmin,  false, false),
            (NotificationTriggers.ApplicationRejected,  NotificationRecipientRoles.TargetUser, true,  true),
            (NotificationTriggers.ApplicationRejected,  NotificationRecipientRoles.ClubAdmin,  false, false),
            // ── Quản lý thành viên ──────────────────────────────────────────
            (NotificationTriggers.MemberAdded,          NotificationRecipientRoles.TargetUser, true,  false),
            (NotificationTriggers.MemberAdded,          NotificationRecipientRoles.ClubAdmin,  false, false),
            (NotificationTriggers.MemberRoleChanged,    NotificationRecipientRoles.TargetUser, true,  false),
            (NotificationTriggers.MemberRoleChanged,    NotificationRecipientRoles.ClubAdmin,  false, false),
            (NotificationTriggers.MemberRemoved,        NotificationRecipientRoles.TargetUser, true,  false),
            (NotificationTriggers.MemberRemoved,        NotificationRecipientRoles.ClubAdmin,  false, false),
            // ── Từ chức ─────────────────────────────────────────────────────
            (NotificationTriggers.ResignationSubmitted, NotificationRecipientRoles.ClubAdmin,  true,  false),
            (NotificationTriggers.ResignationSubmitted, NotificationRecipientRoles.DeptLead,   false, false),
            (NotificationTriggers.ResignationReviewed,  NotificationRecipientRoles.TargetUser, true,  false),
            (NotificationTriggers.ResignationReviewed,  NotificationRecipientRoles.ClubAdmin,  false, false),
            // ── Công việc ────────────────────────────────────────────────────
            (NotificationTriggers.TaskAssigned,         NotificationRecipientRoles.TargetUser, true,  false),
            (NotificationTriggers.TaskAssigned,         NotificationRecipientRoles.DeptLead,   false, false),
            (NotificationTriggers.TaskDeadlineSoon,     NotificationRecipientRoles.TargetUser, true,  false),
            (NotificationTriggers.TaskDeadlineSoon,     NotificationRecipientRoles.DeptLead,   false, false),
            (NotificationTriggers.TaskStatusChanged,    NotificationRecipientRoles.TargetUser, true,  false),
            (NotificationTriggers.TaskStatusChanged,    NotificationRecipientRoles.DeptLead,   false, false),
            // ── Sự kiện ─────────────────────────────────────────────────────
            (NotificationTriggers.EventCreated,         NotificationRecipientRoles.AllMembers, true,  false),
            (NotificationTriggers.EventCreated,         NotificationRecipientRoles.ClubAdmin,  false, false),
            (NotificationTriggers.EventReminder,        NotificationRecipientRoles.AllMembers, true,  false),
            // ── Hệ thống ─────────────────────────────────────────────────────
            (NotificationTriggers.SystemAnnouncement,   NotificationRecipientRoles.AllMembers, true,  false),
            (NotificationTriggers.SystemAnnouncement,   NotificationRecipientRoles.SuperAdmin, false, false),
        ];
    }
}
