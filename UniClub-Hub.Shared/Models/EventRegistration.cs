using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    public class EventRegistration
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string UserId { get; set; } = null!;
        public DateTimeOffset RegisteredAt { get; set; } = DateTimeOffset.UtcNow;
        public AttendanceStatus Attendance { get; set; } = AttendanceStatus.Pending;
        public DateTimeOffset? CheckedInAt { get; set; }
        public string? Note { get; set; }

        public ClubEvent Event { get; set; } = null!;
        public ApplicationUser User { get; set; } = null!;
    }
}
