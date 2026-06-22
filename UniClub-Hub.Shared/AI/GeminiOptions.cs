namespace UniClub_Hub.Shared.AI
{
    public class GeminiOptions
    {
        public string? ApiKey { get; set; }
        public string Model { get; set; } = "gemini-2.0-flash";
        public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com";
        public double Temperature { get; set; } = 0.2;
    }
}
