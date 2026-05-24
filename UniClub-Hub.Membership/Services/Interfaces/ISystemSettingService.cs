using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface ISystemSettingService
    {
        Task<IEnumerable<SystemSetting>> GetAllAsync();
        Task<string?> GetValueAsync(string key);
        Task UpdateAsync(string key, string value, string updatedBy);
        Task<bool> IsRegistrationOpenAsync();
        Task<IReadOnlyList<string>> GetAllowedDomainsAsync();
        Task<string> GetNotificationTextAsync(string key, Dictionary<string, string>? vars = null);
        Task ToggleEnabledAsync(string key, bool enabled, string updatedBy);
    }
}
