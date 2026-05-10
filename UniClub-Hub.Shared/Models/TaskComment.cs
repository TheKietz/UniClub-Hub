namespace UniClub_Hub.Shared.Models
{
    public class TaskComment
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string UserId { get; set; } = null!;
        public string Content { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }
        public bool IsEdited { get; set; }

        public ClubTask Task { get; set; } = null!;
        public ApplicationUser User { get; set; } = null!;
    }
}
