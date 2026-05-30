using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Operations.DTOs.Event
{
    public class UpdateAttendanceDto
    {
        [Required]
        public string Attendance { get; set; } = null!;
        public string? Note { get; set; }
    }
}
