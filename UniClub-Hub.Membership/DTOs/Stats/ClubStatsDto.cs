namespace UniClub_Hub.Membership.DTOs.Stats
{
    public class ClubStatsDto
    {
        public int ClubId { get; set; }
        public string ClubName { get; set; } = null!;
        public int TotalActiveMembers { get; set; }
        public int TotalDepartments { get; set; }
        public Dictionary<UniClub_Hub.Shared.Enums.ClubRole, int> MembersByRole { get; set; } = [];
        public List<DepartmentStatDto> MembersByDepartment { get; set; } = [];
        public ApplicationStatusCountDto Applications { get; set; } = new();
    }

    public class DepartmentStatDto
    {
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; } = null!;
        public int MemberCount { get; set; }
    }
}
