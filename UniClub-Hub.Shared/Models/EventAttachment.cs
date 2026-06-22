using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Shared.Models
{
    public class EventAttachment : ISoftDeletable
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string UploadedBy { get; set; } = null!;
        public string FileUrl { get; set; } = null!;
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public long? FileSize { get; set; }
        public string? Note { get; set; }
        public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

        // ISoftDeletable
        public bool IsDeleted { get; set; }
        public string? DeletedBy { get; set; }

        public ClubEvent Event { get; set; } = null!;
        public ApplicationUser UploadedByUser { get; set; } = null!;
    }
}
