using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    [Table("Tasks")]
    public class ClubTask : IAuditable, ISoftDeletable
    {
        [Key]
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? ParentId { get; set; }
        public int? SprintId { get; set; }
        public int? EventId { get; set; }
        public int? DepartmentId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public DateTimeOffset? Deadline { get; set; }
        public float? EstimatedHours { get; set; }
        public float? ActualHours { get; set; }
        public ClubTaskStatus Status { get; set; } = ClubTaskStatus.Todo;
        public int Progress { get; set; } = 0; // 0–100
        public DateTimeOffset? CompletedAt { get; set; }
        public string? AssignedTo { get; set; } // FK UserId

        // IAuditable — CreatedBy doubles as Creator FK
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        // ISoftDeletable
        public bool IsDeleted { get; set; }
        public string? DeletedBy { get; set; }

        public ClubTask? Parent { get; set; }
        public Club Club { get; set; } = null!;
        public ClubEvent? Event { get; set; }
        public Department? Department { get; set; }
        public Sprint? Sprint { get; set; }
        public ApplicationUser? Assignee { get; set; }
        public ApplicationUser? Creator { get; set; }
        public ICollection<TaskAttachment>? Attachments { get; set; }
        public ICollection<TaskComment>? Comments { get; set; }
        public ICollection<Contribution>? Contributions { get; set; }
        public ICollection<ClubTask>? SubTasks { get; set; }
        public ICollection<TaskDependency>? Dependencies { get; set; }
    }
}
