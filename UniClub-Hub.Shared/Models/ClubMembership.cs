using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    // ClubRole lưu vai trò trong phạm vi 1 CLB: ClubAdmin / DeptLead / Member
    // Vai trò hệ thống (SUPER_ADMIN, USER) quản lý riêng bởi ASP.NET Identity (AspNetRoles)
    public class ClubMembership
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public int ClubId { get; set; }
        public int? DepartmentId { get; set; }
        public ClubRole ClubRole { get; set; } = ClubRole.MEMBER;
        public DateOnly JoinedDate { get; set; }
        public DateOnly? ResignedDate { get; set; }
        public MembershipStatus Status { get; set; } = MembershipStatus.Active;
        public string? MemberCustomData { get; set; } // JSON — values for club's custom fields

        public ApplicationUser User { get; set; } = null!;
        public Club Club { get; set; } = null!;
        public Department? Department { get; set; }
    }
}
