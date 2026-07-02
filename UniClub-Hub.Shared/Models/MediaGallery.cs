using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    public class MediaGallery
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? EventId { get; set; }
        public string MediaUrl { get; set; } = null!;
        public Enums.MediaType MediaType { get; set; } = Enums.MediaType.Image;
        public string? Description { get; set; }

        // Approval workflow
        public MediaStatus Status { get; set; } = MediaStatus.Published;
        public string? UploadedById { get; set; }
        public string? ReviewerId { get; set; }
        public string? ReviewNote { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        public Club Club { get; set; } = null!;
        public ClubEvent? Event { get; set; }
        public ApplicationUser? UploadedBy { get; set; }
        public ApplicationUser? Reviewer { get; set; }
    }
}
