namespace UniClub_Hub.Shared.Models
{
    public class TaskAttachment
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string UserId { get; set; } = null!;
        public string FileUrl { get; set; } = null!;
        public string? FileName { get; set; }
        public string? Note { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        public ClubTask Task { get; set; } = null!;
        public ApplicationUser User { get; set; } = null!;
    }
}
