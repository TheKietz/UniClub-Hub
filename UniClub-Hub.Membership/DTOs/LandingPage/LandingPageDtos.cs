using System.Text.Json;

namespace UniClub_Hub.Membership.DTOs.LandingPage
{
    public class LandingPageResponse
    {
        public string? HeroImage { get; set; }
        public string? Introduction { get; set; }
        public string? Mission { get; set; }
        public string? Vision { get; set; }
        public Dictionary<string, string>? SocialLinks { get; set; }
        public JsonElement? LayoutSettings { get; set; }
    }

    public class UpsertLandingPageRequest
    {
        public string? Introduction { get; set; }
        public string? Mission { get; set; }
        public string? Vision { get; set; }
        public Dictionary<string, string>? SocialLinks { get; set; }
        public JsonElement? LayoutSettings { get; set; }
    }
}
