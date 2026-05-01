namespace UniClub_Hub.Membership.DTOs.Application
{
    public class ApplicationDto
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string ClubName { get; set; } = null!;
        public string Status { get; set; } = null!; // Pending / Interview / Accepted / Rejected
        public DateTime AppliedAt { get; set; }
    }
}
