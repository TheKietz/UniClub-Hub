using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    [Table("Events")]
    public class ClubEvent : IAuditable, ISoftDeletable
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public string? BannerUrl { get; set; }
        public DateTimeOffset? StartTime { get; set; }
        public DateTimeOffset? EndTime { get; set; }
        public int? MaxParticipants { get; set; }
        public EventStatus Status { get; set; } = EventStatus.Draft;

        // IAuditable
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        // ISoftDeletable
        public bool IsDeleted { get; set; }
        public string? DeletedBy { get; set; }

        public decimal? Budget { get; set; }

        [MaxLength(100)]
        public string? Category { get; set; }

        public Club Club { get; set; } = null!;
        public ICollection<EventRegistration>? Registrations { get; set; }
        public ICollection<ClubTask>? Tasks { get; set; }
        public ICollection<Sprint>? Sprints { get; set; }
        public ICollection<MediaGallery>? MediaGalleries { get; set; }
        public ICollection<Contribution>? Contributions { get; set; }
        public ICollection<EventSession>? Sessions { get; set; }
        public ICollection<EventStaff>? Staff { get; set; }
    }
}
