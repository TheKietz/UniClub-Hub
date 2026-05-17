using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.User
{
    public class UserDetailDto
    {
        public string Id { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? FullName { get; set; }
        public string? StudentId { get; set; }
        public string? Major { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Phone { get; set; }
        public string? Gender { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public bool IsLocked { get; set; }
        public bool IsDeleted { get; set; }
        public List<string> Roles { get; set; } = [];
        public List<UserMembershipDto> Memberships { get; set; } = [];
    }

    public class UserMembershipDto
    {
        public int ClubId { get; set; }
        public string ClubName { get; set; } = null!;
        public string? ClubLogoUrl { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public ClubRole ClubRole { get; set; }
        public DateOnly JoinedDate { get; set; }
        public DateOnly? ResignedDate { get; set; }
        public MembershipStatus Status { get; set; }
    }
}
