using System.ComponentModel.DataAnnotations.Schema;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    [Table("EventClubAssignments")]
    public class EventClubAssignment
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public int ClubId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public DateTimeOffset? Deadline { get; set; }
        public string Status { get; set; } = "Pending"; // Pending | InProgress | Done
        public string? AttachmentUrlsJson { get; set; } // JSON: ["url1","url2"]
        public string CreatedBy { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
