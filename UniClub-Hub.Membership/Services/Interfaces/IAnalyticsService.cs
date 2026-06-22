using UniClub_Hub.Membership.DTOs.Analytics;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IAnalyticsService
    {
        Task RecordViewAsync(int clubId, string? ip, string? userAgent, string? path);
        Task<AnalyticsOverviewResponse> GetOverviewAsync(int clubId);
        Task<IEnumerable<DailyViewResponse>> GetDailyViewsAsync(int clubId, int days = 30);
    }
}
