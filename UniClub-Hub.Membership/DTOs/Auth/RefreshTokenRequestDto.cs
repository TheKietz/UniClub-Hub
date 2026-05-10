using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Membership.DTOs.Auth
{
    public class RefreshTokenRequestDto
    {
        [Required]
        public string RefreshToken { get; set; } = null!;
    }
}
