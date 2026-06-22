using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class SystemSettingService(UniClubDbContext db) : ISystemSettingService
    {
        public Task<IEnumerable<SystemSetting>> GetAllAsync() =>
            db.SystemSettings.AsNoTracking().OrderBy(s => s.Category).ThenBy(s => s.Key)
              .ToListAsync().ContinueWith(t => (IEnumerable<SystemSetting>)t.Result);

        public async Task<string?> GetValueAsync(string key) =>
            (await db.SystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == key))?.Value;

        public async Task UpdateAsync(string key, string value, string updatedBy)
        {
            var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == key)
                ?? throw new KeyNotFoundException($"Setting '{key}' không tồn tại.");
            setting.Value = value;
            setting.UpdatedAt = DateTime.UtcNow;
            setting.UpdatedBy = updatedBy;
            await db.SaveChangesAsync();
        }

        public async Task<bool> IsRegistrationOpenAsync()
        {
            var val = await GetValueAsync("auth.registration_open");
            return val?.ToLower() != "false";
        }

        public async Task<IReadOnlyList<string>> GetAllowedDomainsAsync()
        {
            var val = await GetValueAsync("auth.allowed_domains");
            if (string.IsNullOrWhiteSpace(val)) return [];
            return val.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                      .Select(d => d.ToLower()).ToList();
        }

        public async Task<string> GetNotificationTextAsync(string key, Dictionary<string, string>? vars = null)
        {
            var setting = await db.SystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == key);
            if (setting == null || !setting.IsEnabled) return string.Empty;
            var template = setting.Value;
            if (string.IsNullOrEmpty(template) || vars == null) return template;
            foreach (var (k, v) in vars)
                template = template.Replace("{{" + k + "}}", v);
            return template;
        }

        public async Task ToggleEnabledAsync(string key, bool enabled, string updatedBy)
        {
            var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == key)
                ?? throw new KeyNotFoundException($"Setting '{key}' không tồn tại.");
            setting.IsEnabled = enabled;
            setting.UpdatedAt = DateTime.UtcNow;
            setting.UpdatedBy = updatedBy;
            await db.SaveChangesAsync();
        }
    }
}
