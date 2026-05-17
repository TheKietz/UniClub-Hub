using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Operations.DTOs.Event
{
    public class CreateEventDto
    {
        [Required, MaxLength(255)]
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public string? BannerUrl { get; set; }
        public DateTimeOffset? StartTime { get; set; }
        public DateTimeOffset? EndTime { get; set; }
        public int? MaxParticipants { get; set; }
    }
}
