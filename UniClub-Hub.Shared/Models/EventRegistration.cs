using UniClub_Hub.Shared.Common;
namespace UniClub_Hub.Shared.Models
{
    public class EventRegistration
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string UserId { get; set; } = null!;
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
        public string Attendance { get; set; } = "Pending"; // Pending / CheckedIn / Absent

        public ClubEvent Event { get; set; } = null!;
        public ApplicationUser User { get; set; } = null!;
    }
}
