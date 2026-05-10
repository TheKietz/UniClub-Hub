namespace UniClub_Hub.Membership.DTOs.Stats
{
    public class SystemStatsDto
    {
        public int TotalUsers { get; set; }
        public int TotalClubs { get; set; }
        public int ActiveClubs { get; set; }
        public int TotalActiveMembers { get; set; }
        public ApplicationStatusCountDto Applications { get; set; } = new();
        public List<CategoryStatDto> ClubsByCategory { get; set; } = [];
        public List<TopClubDto> TopClubsByMembers { get; set; } = [];
    }

    public class ApplicationStatusCountDto
    {
        public int Pending { get; set; }
        public int Interview { get; set; }
        public int Accepted { get; set; }
        public int Rejected { get; set; }
        public int Total => Pending + Interview + Accepted + Rejected;
    }

    public class CategoryStatDto
    {
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = null!;
        public int ClubCount { get; set; }
    }

    public class TopClubDto
    {
        public int ClubId { get; set; }
        public string ClubName { get; set; } = null!;
        public int MemberCount { get; set; }
    }
}
