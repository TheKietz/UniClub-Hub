using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.DTOs.Assignment
{
    public class AssignmentDto
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string? EventName { get; set; }
        public int ClubId { get; set; }
        public string? ClubName { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public TaskPriority Priority { get; set; }
        public DateTimeOffset? Deadline { get; set; }
        public string Status { get; set; } = "Pending";
        public List<string> AttachmentUrls { get; set; } = [];
        public string CreatedBy { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }
    }
}
