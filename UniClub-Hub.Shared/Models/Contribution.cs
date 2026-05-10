using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    public class Contribution
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public int ClubId { get; set; }
        public int? TaskId { get; set; }
        public int? EventId { get; set; }
        public Enums.ActivityType ActivityType { get; set; }
        public int Points { get; set; }
        public string? Note { get; set; }
        public DateTimeOffset RecordedAt { get; set; } = DateTimeOffset.UtcNow;

        public ApplicationUser User { get; set; } = null!;
        public Club Club { get; set; } = null!;
        public ClubTask? Task { get; set; }
        public ClubEvent? Event { get; set; }
    }
}
