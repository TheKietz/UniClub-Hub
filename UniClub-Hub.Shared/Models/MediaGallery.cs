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

        public Club Club { get; set; } = null!;
        public ClubEvent? Event { get; set; }
    }
}
