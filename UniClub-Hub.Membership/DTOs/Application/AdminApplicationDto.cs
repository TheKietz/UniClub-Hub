namespace UniClub_Hub.Membership.DTOs.Application
{
    public class AdminApplicationDto : ApplicationDto
    {
        public string UserId { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? StudentId { get; set; }
        public string? Answers { get; set; } // JSON
    }
}
