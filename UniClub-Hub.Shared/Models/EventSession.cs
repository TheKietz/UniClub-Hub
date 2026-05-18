using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniClub_Hub.Shared.Models
{
    [Table("EventSessions")]
    public class EventSession
    {
        public int Id { get; set; }
        public int EventId { get; set; }

        [Required, MaxLength(255)]
        public string Title { get; set; } = null!;

        [MaxLength(5)]
        public string StartTime { get; set; } = null!;

        [MaxLength(5)]
        public string EndTime { get; set; } = null!;

        public string? Description { get; set; }

        [MaxLength(255)]
        public string? Location { get; set; }

        public int SortOrder { get; set; }

        public DateTime CreatedAt { get; set; }

        public ClubEvent Event { get; set; } = null!;
    }
}
