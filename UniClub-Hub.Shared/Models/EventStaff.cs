using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniClub_Hub.Shared.Models
{
    [Table("EventStaff")]
    public class EventStaff
    {
        public int Id { get; set; }
        public int EventId { get; set; }

        [Required]
        public string UserId { get; set; } = null!;

        [MaxLength(50)]
        public string Role { get; set; } = "Staff";

        public DateTime AssignedAt { get; set; }

        public ClubEvent Event { get; set; } = null!;
        public ApplicationUser User { get; set; } = null!;
    }
}
