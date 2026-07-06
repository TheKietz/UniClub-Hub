namespace UniClub_Hub.Operations.DTOs.Event
{
    public class EventRegistrationDto
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string UserId { get; set; } = null!;
        public string UserName { get; set; } = null!;
        public string? AvatarUrl { get; set; }
        public string? Email { get; set; }
        public string? StudentId { get; set; }
        public DateTimeOffset RegisteredAt { get; set; }
        public string Attendance { get; set; } = null!;
        public DateTimeOffset? CheckedInAt { get; set; }
        public string? Note { get; set; }
    }
}
