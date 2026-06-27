using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.DTOs.Event
{
    public class EventDto
    {
        public int Id { get; set; }
        public int? ClubId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public string? BannerUrl { get; set; }
        public DateTimeOffset? StartTime { get; set; }
        public DateTimeOffset? EndTime { get; set; }
        public int? MaxParticipants { get; set; }
        public EventStatus Status { get; set; }
        public decimal? Budget { get; set; }
        public string? Category { get; set; }
        public string? Summary { get; set; }
        public int ParticipantCount { get; set; }
        public string? RegistrationLink { get; set; }
        public List<EventSessionDto> Sessions { get; set; } = [];
        public List<EventStaffDto> Staff { get; set; } = [];
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
    }
}
