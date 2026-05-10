using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Membership.DTOs.User
{
    public class ChangeRoleDto
    {
        [Required]
        public string Role { get; set; } = null!; // "USER" | "SUPER_ADMIN"
    }
}
