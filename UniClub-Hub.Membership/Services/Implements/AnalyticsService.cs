using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Analytics;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class AnalyticsService(UniClubDbContext db) : IAnalyticsService
    {
        public async Task RecordViewAsync(int clubId, string? ip, string? userAgent, string? path)
        {
            db.PageViews.Add(new PageView
            {
                ClubId = clubId,
                VisitedAt = DateTime.UtcNow,
                VisitorIp = ip,
                UserAgent = userAgent?.Length > 500 ? userAgent[..500] : userAgent,
                Path = path?.Length > 200 ? path[..200] : path,
            });
            await db.SaveChangesAsync();
        }

        public async Task<AnalyticsOverviewResponse> GetOverviewAsync(int clubId)
        {
            var now = DateTime.UtcNow;
            var startOfThisWeek = now.AddDays(-7);
            var startOfLastWeek = now.AddDays(-14);
            var startOfThisMonth = now.AddDays(-30);
            var startOfLastMonth = now.AddDays(-60);

            var views = await db.PageViews
                .Where(pv => pv.ClubId == clubId)
                .Select(pv => pv.VisitedAt)
                .ToListAsync();

            var total = views.Count;
            var thisWeek = views.Count(v => v >= startOfThisWeek);
            var lastWeek = views.Count(v => v >= startOfLastWeek && v < startOfThisWeek);
            var thisMonth = views.Count(v => v >= startOfThisMonth);
            var lastMonth = views.Count(v => v >= startOfLastMonth && v < startOfThisMonth);

            double weeklyGrowth = lastWeek == 0
                ? (thisWeek > 0 ? 100 : 0)
                : Math.Round((thisWeek - lastWeek) / (double)lastWeek * 100, 1);

            double monthlyGrowth = lastMonth == 0
                ? (thisMonth > 0 ? 100 : 0)
                : Math.Round((thisMonth - lastMonth) / (double)lastMonth * 100, 1);

            double avg = thisMonth > 0 ? Math.Round(thisMonth / 30.0, 1) : 0;

            return new AnalyticsOverviewResponse
            {
                TotalViews = total,
                ViewsThisWeek = thisWeek,
                ViewsLastWeek = lastWeek,
                ViewsThisMonth = thisMonth,
                ViewsLastMonth = lastMonth,
                AvgViewsPerDay = avg,
                WeeklyGrowthPercent = weeklyGrowth,
                MonthlyGrowthPercent = monthlyGrowth,
            };
        }

        public async Task<IEnumerable<DailyViewResponse>> GetDailyViewsAsync(int clubId, int days = 30)
        {
            var from = DateTime.UtcNow.Date.AddDays(-(days - 1));

            var raw = await db.PageViews
                .Where(pv => pv.ClubId == clubId && pv.VisitedAt >= from)
                .GroupBy(pv => pv.VisitedAt.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToListAsync();

            // Fill missing dates with 0
            return Enumerable.Range(0, days)
                .Select(i => from.AddDays(i))
                .Select(date =>
                {
                    var found = raw.FirstOrDefault(r => r.Date == date);
                    return new DailyViewResponse
                    {
                        Date = date.ToString("yyyy-MM-dd"),
                        Count = found?.Count ?? 0,
                    };
                });
        }
    }
}
