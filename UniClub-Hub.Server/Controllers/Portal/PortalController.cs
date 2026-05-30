using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Portal.DTOs;
using UniClub_Hub.Portal.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Portal
{
    /// <summary>
    /// Public portal endpoints — no authentication required.
    /// Serves the club explorer page and per-club landing page data.
    /// </summary>
    [ApiController]
    [Route("api/v1/portal")]
    public class PortalController(IPortalService portalService) : ControllerBase
    {
        // GET /api/v1/portal/clubs?search=&categoryId=&page=1&pageSize=12
        [HttpGet("clubs")]
        public async Task<IActionResult> GetExploreClubs(
            [FromQuery] string? search,
            [FromQuery] int? categoryId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            if (page < 1) page = 1;
            if (pageSize is < 1 or > 50) pageSize = 12;

            var result = await portalService.GetExploreClubsAsync(search, categoryId, page, pageSize);
            return Ok(result);
        }

        // GET /api/v1/portal/clubs/:clubId
        [HttpGet("clubs/{clubId:int}")]
        public async Task<IActionResult> GetClubLandingPage(int clubId)
        {
            try
            {
                var result = await portalService.GetClubLandingPageAsync(clubId);
                return Ok(ApiResponse<ClubLandingDataDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
