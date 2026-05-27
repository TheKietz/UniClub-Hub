using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.DTOs.Sprint
{
    public class SprintDto
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? EventId { get; set; }
        public int? DepartmentId { get; set; }
        public string Name { get; set; } = null!;
        public string? Goal { get; set; }
        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset EndDate { get; set; }
        public SprintStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public int TaskCount { get; set; }
    }
}
