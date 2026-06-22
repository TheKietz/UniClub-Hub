namespace UniClub_Hub.Membership.DTOs.Analytics
{
    public class AnalyticsOverviewResponse
    {
        public int TotalViews { get; set; }
        public int ViewsThisWeek { get; set; }
        public int ViewsLastWeek { get; set; }
        public int ViewsThisMonth { get; set; }
        public int ViewsLastMonth { get; set; }
        public double AvgViewsPerDay { get; set; }
        public double WeeklyGrowthPercent { get; set; }
        public double MonthlyGrowthPercent { get; set; }
    }

    public class DailyViewResponse
    {
        public string Date { get; set; } = null!;  // "yyyy-MM-dd"
        public int Count { get; set; }
    }
}
