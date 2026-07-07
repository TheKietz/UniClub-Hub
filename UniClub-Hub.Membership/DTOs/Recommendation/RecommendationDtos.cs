namespace UniClub_Hub.Membership.DTOs.Recommendation
{
    public class ClubRecommendationResponse
    {
        public int ClubId { get; set; }
        public string Name { get; set; } = null!;
        public string? LogoUrl { get; set; }
        public string? Description { get; set; }
        public string? CategoryName { get; set; }
        public int MemberCount { get; set; }
        public double SimilarityScore { get; set; }
        public string Reason { get; set; } = null!;
    }
}
