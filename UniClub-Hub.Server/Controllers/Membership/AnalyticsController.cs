using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Analytics;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId:int}/analytics")]
    [Authorize]
    public class AnalyticsController(IAnalyticsService analytics, UniClubDbContext db) : ControllerBase
    {
        // GET /api/clubs/{clubId}/analytics/overview
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview(int clubId)
        {
            if (!await IsClubAdminOrSuperAdmin(clubId)) return Forbid();

            var result = await analytics.GetOverviewAsync(clubId);
            return Ok(ApiResponse<AnalyticsOverviewResponse>.Ok(result));
        }

        // GET /api/clubs/{clubId}/analytics/daily-views?days=30
        [HttpGet("daily-views")]
        public async Task<IActionResult> GetDailyViews(int clubId, [FromQuery] int days = 30)
        {
            if (!await IsClubAdminOrSuperAdmin(clubId)) return Forbid();

            if (days < 7 || days > 90) days = 30;

            var result = await analytics.GetDailyViewsAsync(clubId, days);
            return Ok(ApiResponse<IEnumerable<DailyViewResponse>>.Ok(result));
        }

        private async Task<bool> IsClubAdminOrSuperAdmin(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return false;
            return await db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId && m.UserId == userId &&
                m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);
        }
    }
}
