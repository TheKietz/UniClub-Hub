using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Membership.DTOs.Department
{
    public class UpdateDepartmentDto
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
    }
}
