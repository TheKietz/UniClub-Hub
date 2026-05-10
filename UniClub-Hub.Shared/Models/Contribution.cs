using UniClub_Hub.Shared.Common;
namespace UniClub_Hub.Shared.Models
{
    public class Contribution
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public int ClubId { get; set; }
        public int? TaskId { get; set; }
        public int? EventId { get; set; }
        public string ActivityType { get; set; } = null!; // Task / Event / Post
        public int Points { get; set; }
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

        public ApplicationUser User { get; set; } = null!;
        public Club Club { get; set; } = null!;
        public ClubTask? Task { get; set; }
        public ClubEvent? Event { get; set; }
    }
}
