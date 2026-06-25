namespace UniClub_Hub.Operations.DTOs.Intelligence
{
    public class AssignmentSuggestionResponse
    {
        public string UserId { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? AvatarUrl { get; set; }
        public double SuitabilityScore { get; set; }
        public string Reason { get; set; } = null!;
        public double OnTimeRate { get; set; }
        public int ProductivityScore { get; set; }
        public float CurrentWorkloadHours { get; set; }
    }
}
