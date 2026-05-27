using System.ComponentModel.DataAnnotations;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.DTOs.Task
{
    public class UpdateTaskDto
    {
        [Required, MaxLength(255)]
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public DateTimeOffset? StartDate { get; set; }
        public DateTimeOffset? Deadline { get; set; }
        public float? EstimatedHours { get; set; }
        public float? ActualHours { get; set; }
        public string? AssignedTo { get; set; }
        public int? EventId { get; set; }
        public int? SprintId { get; set; }
        public int? DepartmentId { get; set; }
    }
}
