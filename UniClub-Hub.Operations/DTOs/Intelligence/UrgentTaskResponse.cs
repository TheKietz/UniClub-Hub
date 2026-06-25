using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.DTOs.Intelligence
{
    public class UrgentTaskResponse
    {
        public int TaskId { get; set; }
        public string Title { get; set; } = null!;
        public TaskPriority Priority { get; set; }
        public ClubTaskStatus Status { get; set; }
        public DateTimeOffset? Deadline { get; set; }
        public string? AssigneeName { get; set; }
        public int DependentsWaiting { get; set; }
        public double HoursToDeadline { get; set; }
        public double UrgencyIndex { get; set; }
        public string UrgencyReason { get; set; } = null!;
    }
}
