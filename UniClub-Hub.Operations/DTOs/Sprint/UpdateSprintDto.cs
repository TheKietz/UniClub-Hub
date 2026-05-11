using System.ComponentModel.DataAnnotations;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.DTOs.Sprint
{
    public class UpdateSprintDto
    {
        [Required, MaxLength(255)]
        public string Name { get; set; } = null!;
        public string? Goal { get; set; }
        [Required]
        public DateTimeOffset StartDate { get; set; }
        [Required]
        public DateTimeOffset EndDate { get; set; }
        public SprintStatus Status { get; set; }
        public int? EventId { get; set; }
    }
}
