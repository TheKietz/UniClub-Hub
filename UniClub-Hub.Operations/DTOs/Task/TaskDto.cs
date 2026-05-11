using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.DTOs.Task
{
    public class TaskDto
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? ParentId { get; set; }
        public int? SprintId { get; set; }
        public int? EventId { get; set; }
        public int? DepartmentId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public TaskPriority Priority { get; set; }
        public DateTimeOffset? Deadline { get; set; }
        public float? EstimatedHours { get; set; }
        public float? ActualHours { get; set; }
        public ClubTaskStatus Status { get; set; }
        public int Progress { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public string? AssignedTo { get; set; }
        public string? AssigneeName { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public int SubTaskCount { get; set; }
        public bool IsBlocked { get; set; }
        public int BlockingCount { get; set; }
    }
}
