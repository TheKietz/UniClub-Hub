using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Operations.DTOs.Event
{
    public class EventStaffDto
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string UserId { get; set; } = null!;
        public string UserName { get; set; } = null!;
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = null!;
        public DateTime AssignedAt { get; set; }
    }

    public class AssignEventStaffDto
    {
        [Required]
        public string UserId { get; set; } = null!;

        [MaxLength(50)]
        public string Role { get; set; } = "Staff";
    }
}
