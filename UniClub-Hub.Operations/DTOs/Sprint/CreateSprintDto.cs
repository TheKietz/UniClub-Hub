using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Operations.DTOs.Sprint
{
    public class CreateSprintDto
    {
        [Required, MaxLength(255)]
        public string Name { get; set; } = null!;
        public string? Goal { get; set; }
        [Required]
        public DateTimeOffset StartDate { get; set; }
        [Required]
        public DateTimeOffset EndDate { get; set; }
        public int? EventId { get; set; }
        public int? DepartmentId { get; set; }
    }
}
