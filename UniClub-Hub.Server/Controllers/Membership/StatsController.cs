using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Stats;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api")]
    [Authorize]
    public class StatsController : ControllerBase
    {
        private readonly IStatsService _statsService;
        private readonly UniClubDbContext _db;

        public StatsController(IStatsService statsService, UniClubDbContext db)
        {
            _statsService = statsService;
            _db = db;
        }

        // Thống kê toàn hệ thống — SUPER_ADMIN
        [HttpGet("admin/stats")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> GetSystemStats()
        {
            var stats = await _statsService.GetSystemStatsAsync();
            return Ok(ApiResponse<SystemStatsDto>.Ok(stats));
        }

        // Thống kê theo CLB — CLUB_ADMIN của CLB đó hoặc SUPER_ADMIN
        [HttpGet("clubs/{clubId}/stats")]
        public async Task<IActionResult> GetClubStats(int clubId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            if (!isSuperAdmin)
            {
                var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                    m.UserId == userId
                    && m.ClubId == clubId
                    && m.ClubRole == UniClub_Hub.Shared.Enums.ClubRole.CLUB_ADMIN
                    && m.Status == MembershipStatus.Active
                );

                if (!isClubAdmin)
                    return Forbid();
            }

            var stats = await _statsService.GetClubStatsAsync(clubId);
            if (stats == null)
                return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

            return Ok(ApiResponse<ClubStatsDto>.Ok(stats));
        }
    }
}
