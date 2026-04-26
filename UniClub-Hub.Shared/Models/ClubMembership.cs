namespace UniClub_Hub.Shared.Models
{
    // ClubRole lưu vai trò trong phạm vi 1 CLB: CLUB_ADMIN / DEPT_LEAD / DEPT_DEPUTY / MEMBER
    // Vai trò hệ thống (SUPER_ADMIN, USER) quản lý riêng bởi ASP.NET Identity (AspNetRoles)
    public class ClubMembership
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public int ClubId { get; set; }
        public int? DepartmentId { get; set; }
        public string ClubRole { get; set; } = "MEMBER";
        public DateOnly JoinedDate { get; set; }
        public string Status { get; set; } = "Active"; // Active / Resigned

        public ApplicationUser User { get; set; } = null!;
        public Club Club { get; set; } = null!;
        public Department? Department { get; set; }
    }
}
