namespace UniClub_Hub.Membership.DTOs.Membership
{
    public class MemberDto
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? StudentId { get; set; }
        public string? AvatarUrl { get; set; }
        public string ClubRole { get; set; } = null!;
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public DateOnly JoinedDate { get; set; }
        public string Status { get; set; } = null!;
    }
}
