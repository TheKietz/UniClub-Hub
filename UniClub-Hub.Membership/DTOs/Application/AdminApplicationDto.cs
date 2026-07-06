namespace UniClub_Hub.Membership.DTOs.Application
{
    public class AdminApplicationDto : ApplicationDto
    {
        public string UserId { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? StudentId { get; set; }
        public string? Answers { get; set; } // JSON
        public string? MemberFieldData { get; set; } // JSON
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewerName { get; set; }
        public int? CurrentStageId { get; set; }
        public string? CurrentStageName { get; set; }
    }
}
