using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Server.Data
{
    public static class NotificationPreferenceSeeder
    {
        public static async Task SeedDefaultsAsync(UniClubDbContext db)
        {
            var existingSet = (await db.NotificationPreferences
                    .Where(p => p.ClubId == null)
                    .Select(p => new { p.TriggerKey, p.RecipientRole })
                    .ToListAsync())
                .Select(p => $"{p.TriggerKey}:{p.RecipientRole}")
                .ToHashSet();

            var defaults = BuildDefaultPreferences();
            var toAdd = defaults
                .Where(p => !existingSet.Contains($"{p.TriggerKey}:{p.RecipientRole}"))
                .ToList();

            if (toAdd.Count == 0)
                return;

            db.NotificationPreferences.AddRange(toAdd);
            await db.SaveChangesAsync();
        }

        private static NotificationPreference Pref(
            string trigger,
            string role,
            bool inApp,
            bool email,
            string? emailSubj = null) =>
            new()
            {
                ClubId = null,
                TriggerKey = trigger,
                RecipientRole = role,
                InAppEnabled = inApp,
                EmailEnabled = email,
                EmailSubject = emailSubj,
            };

        private static IEnumerable<NotificationPreference> BuildDefaultPreferences() =>
        [
            Pref(NotificationTriggers.ApplicationSubmitted, NotificationRecipientRoles.ClubAdmin, true, false),
            Pref(NotificationTriggers.ApplicationSubmitted, NotificationRecipientRoles.DeptLead, false, false),
            Pref(NotificationTriggers.ApplicationInterview, NotificationRecipientRoles.TargetUser, true, true, "Mời phỏng vấn – {{clubName}}"),
            Pref(NotificationTriggers.ApplicationInterview, NotificationRecipientRoles.ClubAdmin, false, false),
            Pref(NotificationTriggers.ApplicationAccepted, NotificationRecipientRoles.TargetUser, true, true, "Đơn được chấp nhận – {{clubName}}"),
            Pref(NotificationTriggers.ApplicationAccepted, NotificationRecipientRoles.ClubAdmin, false, false),
            Pref(NotificationTriggers.ApplicationRejected, NotificationRecipientRoles.TargetUser, true, true, "Kết quả đơn đăng ký – {{clubName}}"),
            Pref(NotificationTriggers.ApplicationRejected, NotificationRecipientRoles.ClubAdmin, false, false),
            Pref(NotificationTriggers.MemberAdded, NotificationRecipientRoles.TargetUser, true, false),
            Pref(NotificationTriggers.MemberAdded, NotificationRecipientRoles.ClubAdmin, false, false),
            Pref(NotificationTriggers.MemberRoleChanged, NotificationRecipientRoles.TargetUser, true, false),
            Pref(NotificationTriggers.MemberRoleChanged, NotificationRecipientRoles.ClubAdmin, false, false),
            Pref(NotificationTriggers.MemberRemoved, NotificationRecipientRoles.TargetUser, true, false),
            Pref(NotificationTriggers.MemberRemoved, NotificationRecipientRoles.ClubAdmin, false, false),
            Pref(NotificationTriggers.ResignationSubmitted, NotificationRecipientRoles.ClubAdmin, true, false),
            Pref(NotificationTriggers.ResignationSubmitted, NotificationRecipientRoles.DeptLead, false, false),
            Pref(NotificationTriggers.ResignationReviewed, NotificationRecipientRoles.TargetUser, true, false),
            Pref(NotificationTriggers.ResignationReviewed, NotificationRecipientRoles.ClubAdmin, false, false),
            Pref(NotificationTriggers.TaskAssigned, NotificationRecipientRoles.TargetUser, true, false),
            Pref(NotificationTriggers.TaskAssigned, NotificationRecipientRoles.DeptLead, false, false),
            Pref(NotificationTriggers.TaskDeadlineSoon, NotificationRecipientRoles.TargetUser, true, false),
            Pref(NotificationTriggers.TaskDeadlineSoon, NotificationRecipientRoles.DeptLead, false, false),
            Pref(NotificationTriggers.TaskStatusChanged, NotificationRecipientRoles.TargetUser, true, false),
            Pref(NotificationTriggers.TaskStatusChanged, NotificationRecipientRoles.DeptLead, false, false),
            Pref(NotificationTriggers.EventCreated, NotificationRecipientRoles.AllMembers, true, false),
            Pref(NotificationTriggers.EventCreated, NotificationRecipientRoles.ClubAdmin, false, false),
            Pref(NotificationTriggers.EventReminder, NotificationRecipientRoles.AllMembers, true, false),
            Pref(NotificationTriggers.SystemAnnouncement, NotificationRecipientRoles.AllMembers, true, false),
            Pref(NotificationTriggers.SystemAnnouncement, NotificationRecipientRoles.SuperAdmin, false, false),
        ];
    }
}
