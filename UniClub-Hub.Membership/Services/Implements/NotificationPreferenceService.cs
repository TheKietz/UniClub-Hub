using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.NotificationPreference;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class NotificationPreferenceService : INotificationPreferenceService
    {
        private readonly UniClubDbContext _db;

        public NotificationPreferenceService(UniClubDbContext db) => _db = db;

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
                var club   = clubPrefs.FirstOrDefault(p => p.TriggerKey == trigger && p.RecipientRole == role);
                var global = globalPrefs.FirstOrDefault(p => p.TriggerKey == trigger && p.RecipientRole == role);
                result.Add(ToDto(trigger, role, club ?? global, isOverride: club != null, defInApp, defEmail));
            }
            return result;
        }

        public async Task UpsertGlobalAsync(string triggerKey, string recipientRole,
            UpdateNotificationPreferenceDto dto, string updatedBy)
        {
            var existing = await _db.NotificationPreferences
                .FirstOrDefaultAsync(p => p.ClubId == null && p.TriggerKey == triggerKey && p.RecipientRole == recipientRole);

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
        }

        public async Task UpsertClubAsync(int clubId, string triggerKey, string recipientRole,
            UpdateNotificationPreferenceDto dto)
        {
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

        public async Task ResetClubAsync(int clubId, string triggerKey, string recipientRole)
        {
            var existing = await _db.NotificationPreferences
                .FirstOrDefaultAsync(p => p.ClubId == clubId && p.TriggerKey == triggerKey && p.RecipientRole == recipientRole);

            if (existing != null)
            {
                _db.NotificationPreferences.Remove(existing);
                await _db.SaveChangesAsync();
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
            string trigger, string role, NotificationPreference? pref, bool isOverride,
            bool defaultInApp = true, bool defaultEmail = false)
        {
            NotificationTriggers.Meta.TryGetValue(trigger, out var meta);
            NotificationRecipientRoles.Labels.TryGetValue(role, out var roleLabel);
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
            };
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
