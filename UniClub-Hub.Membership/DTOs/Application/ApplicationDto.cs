using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Application
{
    public class ApplicationDto
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string ClubName { get; set; } = null!;
        public ApplicationStatus Status { get; set; }
        public DateTime AppliedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNote { get; set; }
    }
}
