namespace UniClub_Hub.Shared.Models
{
    public class ClubMemberPosition
    {
        public int MembershipId { get; set; }
        public int PositionId { get; set; }
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public string? AssignedBy { get; set; }

        public ClubMembership Membership { get; set; } = null!;
        public ClubPosition Position { get; set; } = null!;
    }
}
