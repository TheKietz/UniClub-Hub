namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface INotificationDispatchService
    {
        /// <summary>
        /// Fire an in-app notification for a trigger, resolving recipients from preferences.
        /// Context vars are substituted into templates (e.g. {{clubName}}, {{userName}}).
        /// For TARGET_USER / APPLICANT recipients, include "targetUserId" / "applicantUserId" in context.
        /// </summary>
        Task FireAsync(string triggerKey, int? clubId, Dictionary<string, string> context);

        /// <summary>
        /// Returns true if email is enabled for this trigger+role combination (club override → global fallback).
        /// </summary>
        Task<bool> IsEmailEnabledAsync(string triggerKey, string recipientRole, int? clubId);
    }
}
