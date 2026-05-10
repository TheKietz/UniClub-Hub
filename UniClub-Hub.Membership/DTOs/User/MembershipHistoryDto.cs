namespace UniClub_Hub.Membership.DTOs.User
{
    public class MembershipHistoryDto
    {
        public int MembershipId { get; set; }
        public int ClubId { get; set; }
        public string ClubName { get; set; } = null!;
        public string? ClubLogoUrl { get; set; }
        public string ClubRole { get; set; } = null!;
        public string? DepartmentName { get; set; }
        public string Status { get; set; } = null!;
        public DateOnly JoinedDate { get; set; }
        public DateOnly? ResignedDate { get; set; }
    }
}
