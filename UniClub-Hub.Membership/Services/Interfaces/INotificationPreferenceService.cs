using UniClub_Hub.Membership.DTOs.NotificationPreference;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface INotificationPreferenceService
    {
        Task<IEnumerable<NotificationPreferenceDto>> GetGlobalAsync();
        Task<IEnumerable<NotificationPreferenceDto>> GetForClubAsync(int clubId);
        Task UpsertGlobalAsync(string triggerKey, string recipientRole, UpdateNotificationPreferenceDto dto, string updatedBy);
        Task UpsertClubAsync(int clubId, string triggerKey, string recipientRole, UpdateNotificationPreferenceDto dto, string requesterUserId, bool isSuperAdmin);
        Task ResetClubAsync(int clubId, string triggerKey, string recipientRole, string requesterUserId, bool isSuperAdmin);
    }
}
