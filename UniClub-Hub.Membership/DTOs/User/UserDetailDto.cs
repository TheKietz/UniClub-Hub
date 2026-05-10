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
        public string ClubRole { get; set; } = null!;
        public DateOnly JoinedDate { get; set; }
        public string Status { get; set; } = null!;
    }
}
