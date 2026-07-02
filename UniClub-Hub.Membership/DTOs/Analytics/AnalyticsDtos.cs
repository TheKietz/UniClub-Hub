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

    public class PostStatItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string Category { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }

    public class ContentStatsResponse
    {
        public int TotalPosts { get; set; }
        public int PublishedPosts { get; set; }
        public int PendingPosts { get; set; }
        public int DraftPosts { get; set; }
        public int RejectedPosts { get; set; }
        public int TotalMedia { get; set; }
        public int ImageCount { get; set; }
        public int VideoCount { get; set; }
        public List<PostStatItem> RecentPosts { get; set; } = [];
    }
}
