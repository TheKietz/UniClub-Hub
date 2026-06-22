using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Recommendation;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/v1/recommendations")]
    public class RecommendationController(IRecommendationService recommendationService) : ControllerBase
    {
        // GET /api/v1/recommendations/clubs?topN=3
        [HttpGet("clubs")]
        public async Task<IActionResult> GetClubRecommendations([FromQuery] int topN = 3)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); // null if not logged in
            var result = await recommendationService.GetRecommendationsAsync(userId, topN);
            return Ok(ApiResponse<IEnumerable<ClubRecommendationResponse>>.Ok(result));
        }
    }
}
