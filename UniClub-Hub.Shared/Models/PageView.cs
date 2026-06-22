namespace UniClub_Hub.Shared.Models
{
    public class PageView
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public DateTime VisitedAt { get; set; } = DateTime.UtcNow;
        public string? VisitorIp { get; set; }
        public string? UserAgent { get; set; }
        public string? Path { get; set; }

        public Club? Club { get; set; }
    }
}
