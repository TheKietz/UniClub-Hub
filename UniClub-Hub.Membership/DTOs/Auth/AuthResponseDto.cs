using System.Text.Json.Serialization;

namespace UniClub_Hub.Membership.DTOs.Auth
{
    public class AuthResponseDto
    {
        public string AccessToken { get; set; } = null!;

        // Chỉ dùng nội bộ để controller set HttpOnly cookie — không serialize ra JSON
        [JsonIgnore]
        public string RefreshToken { get; set; } = null!;

        public string Email { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string SystemRole { get; set; } = null!;
        public DateTime AccessTokenExpiresAt { get; set; }
    }
}
