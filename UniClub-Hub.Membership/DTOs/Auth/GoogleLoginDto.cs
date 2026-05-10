using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Membership.DTOs.Auth
{
    public class GoogleLoginDto
    {
        [Required]
        public string AccessToken { get; set; } = null!;
    }
}
