using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Operations.DTOs.Event
{
    public class EventSessionDto
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string Title { get; set; } = null!;
        public string StartTime { get; set; } = null!;
        public string EndTime { get; set; } = null!;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public int SortOrder { get; set; }
    }

    public class CreateEventSessionDto
    {
        [Required, MaxLength(255)]
        public string Title { get; set; } = null!;

        [Required, MaxLength(5)]
        public string StartTime { get; set; } = null!;

        [Required, MaxLength(5)]
        public string EndTime { get; set; } = null!;

        public string? Description { get; set; }

        [MaxLength(255)]
        public string? Location { get; set; }

        public int SortOrder { get; set; }
    }

    public class ReorderEventSessionsDto
    {
        public List<int> OrderedIds { get; set; } = [];
    }
}
