using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.DTOs.Intelligence
{
    public class AtRiskTaskResponse
    {
        public int TaskId { get; set; }
        public string Title { get; set; } = null!;
        public string? AssigneeName { get; set; }
        public DateTimeOffset? Deadline { get; set; }
        public int Progress { get; set; }
        public double ExpectedProgress { get; set; }
        public double DaysRemaining { get; set; }
        public TaskPriority Priority { get; set; }
        public ClubTaskStatus Status { get; set; }
    }
}
