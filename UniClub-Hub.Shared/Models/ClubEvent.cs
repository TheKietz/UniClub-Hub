using UniClub_Hub.Shared.Common;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniClub_Hub.Shared.Models
{
    [Table("Events")]
    public class ClubEvent
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int? MaxParticipants { get; set; }
        public string Status { get; set; } = "Draft"; // Draft / Published / Completed / Cancelled

        public Club Club { get; set; } = null!;
        public ICollection<EventRegistration>? Registrations { get; set; }
        public ICollection<ClubTask>? Tasks { get; set; }
        public ICollection<MediaGallery>? MediaGalleries { get; set; }
        public ICollection<Contribution>? Contributions { get; set; }
    }
}
