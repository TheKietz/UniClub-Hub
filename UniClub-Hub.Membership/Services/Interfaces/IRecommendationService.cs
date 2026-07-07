using UniClub_Hub.Membership.DTOs.Recommendation;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IRecommendationService
    {
        Task<IEnumerable<ClubRecommendationResponse>> GetRecommendationsAsync(string? userId, int topN = 3);
    }
}
