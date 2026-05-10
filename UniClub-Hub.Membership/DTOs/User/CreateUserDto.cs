using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Membership.DTOs.User
{
    public class CreateUserDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = null!;

        [Required, MinLength(6)]
        public string Password { get; set; } = null!;

        public string? FullName { get; set; }
        public string? StudentId { get; set; }
        public string? Major { get; set; }
        public string? Gender { get; set; }

        // "USER" hoặc "SUPER_ADMIN"
        public string Role { get; set; } = "USER";
    }
}
