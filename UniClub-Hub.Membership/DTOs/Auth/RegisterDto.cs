using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Membership.DTOs.Auth
{
    public class RegisterDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = null!;

        [Required, MinLength(6)]
        public string Password { get; set; } = null!;

        [Required]
        public string FullName { get; set; } = null!;

        [Required]
        public string StudentId { get; set; } = null!;

        [Required]
        public string Major { get; set; } = null!;

        [RegularExpression(@"^0\d{9,10}$", ErrorMessage = "Số điện thoại không hợp lệ")]
        public string? Phone { get; set; }
    }
}
