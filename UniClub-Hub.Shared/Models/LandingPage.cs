using UniClub_Hub.Shared.Common;
namespace UniClub_Hub.Shared.Models
{
    public class LandingPage
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string? HeroImage { get; set; }
        public string? Introduction { get; set; }
        public string? Mission { get; set; }
        public string? Vision { get; set; }
        public string? SocialLinks { get; set; }    // JSONB — { "facebook": "...", "zalo": "..." }
        public string? LayoutSettings { get; set; } // JSONB — màu sắc, thứ tự section

        public Club Club { get; set; } = null!;
    }
}
