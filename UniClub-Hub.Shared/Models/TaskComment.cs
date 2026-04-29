namespace UniClub_Hub.Shared.Models
{
    public class TaskComment
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string UserId { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relationships
        public virtual Task? Task { get; set; }
        public virtual ApplicationUser? User { get; set; }
    }
}