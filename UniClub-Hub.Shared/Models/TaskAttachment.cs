using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Shared.Models
{
    public class TaskAttachment : ISoftDeletable
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string UserId { get; set; } = null!;
        public string FileUrl { get; set; } = null!;
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public long? FileSize { get; set; }
        public string? Note { get; set; }
        public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

        // ISoftDeletable
        public bool IsDeleted { get; set; }
        public string? DeletedBy { get; set; }

        public ClubTask Task { get; set; } = null!;
        public ApplicationUser User { get; set; } = null!;
    }
}
