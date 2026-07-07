using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.Services.Interfaces;
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
    public class PortalController(IPortalService portalService, IAnalyticsService analytics) : ControllerBase
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

        // GET /api/v1/portal/events?scope=all|university|club&clubId=&status=&search=&page=1&pageSize=12
        [HttpGet("events")]
        public async Task<IActionResult> GetEventsFeed(
            [FromQuery] string? scope,
            [FromQuery] int? clubId,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            if (page < 1) page = 1;
            if (pageSize is < 1 or > 60) pageSize = 12;

            var result = await portalService.GetEventsFeedAsync(scope, clubId, status, search, page, pageSize);
            return Ok(ApiResponse<PortalPagedResult<PortalEventDto>>.Ok(result));
        }

        // GET /api/v1/portal/news?scope=all|university|club&clubId=&category=&search=&page=1&pageSize=12
        [HttpGet("news")]
        public async Task<IActionResult> GetNewsFeed(
            [FromQuery] string? scope,
            [FromQuery] int? clubId,
            [FromQuery] string? category,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            if (page < 1) page = 1;
            if (pageSize is < 1 or > 60) pageSize = 12;

            var result = await portalService.GetNewsFeedAsync(scope, clubId, category, search, page, pageSize);
            return Ok(ApiResponse<PortalPagedResult<PortalNewsDto>>.Ok(result));
        }

        // POST /api/v1/portal/clubs/:clubId/view — explicit tracking, called once by the public landing page
        [HttpPost("clubs/{clubId:int}/view")]
        public async Task<IActionResult> RecordView(int clubId)
        {
            try
            {
                await analytics.RecordViewAsync(
                    clubId,
                    HttpContext.Connection.RemoteIpAddress?.ToString(),
                    Request.Headers.UserAgent.ToString(),
                    Request.Path
                );
            }
            catch { /* never fail the caller for analytics */ }
            return Ok();
        }
    }
}
