using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Stats;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Constants;
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
        private readonly IClubPermissionService _permissions;

        public StatsController(IStatsService statsService, UniClubDbContext db, IClubPermissionService permissions)
        {
            _statsService = statsService;
            _db = db;
            _permissions = permissions;
        }

        // Xem thống kê/báo cáo CLB: CLUB_ADMIN mặc định đủ quyền, hoặc thành viên được gán
        // Position có quyền xem/xuất báo cáo (khớp guard route REPORTS_VIEW/EXPORT ở frontend).
        private Task<bool> CanViewClubReportsAsync(int clubId, string userId, bool isSuperAdmin) =>
            _permissions.HasAnyPermissionAsync(
                clubId, userId, isSuperAdmin,
                ClubPermissions.ReportsView, ClubPermissions.ReportsExport);

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

            if (!await CanViewClubReportsAsync(clubId, userId, isSuperAdmin))
                return Forbid();

            var stats = await _statsService.GetClubStatsAsync(clubId);
            if (stats == null)
                return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

            return Ok(ApiResponse<ClubStatsDto>.Ok(stats));
        }

        // Biểu đồ tăng trưởng thành viên theo tháng — hệ thống
        [HttpGet("admin/stats/growth")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> GetSystemGrowth([FromQuery] int months = 12)
        {
            var data = await _statsService.GetMemberGrowthAsync(null, months);
            return Ok(ApiResponse<List<MonthlyGrowthDto>>.Ok(data));
        }

        // Biểu đồ tăng trưởng thành viên theo tháng — CLB
        [HttpGet("clubs/{clubId}/stats/growth")]
        public async Task<IActionResult> GetClubGrowth(int clubId, [FromQuery] int months = 12)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            if (!await CanViewClubReportsAsync(clubId, userId, isSuperAdmin))
                return Forbid();

            var data = await _statsService.GetMemberGrowthAsync(clubId, months);
            return Ok(ApiResponse<List<MonthlyGrowthDto>>.Ok(data));
        }
    }
}
