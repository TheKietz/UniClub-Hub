using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}")]
    [Authorize]
    public class ExportController : ControllerBase
    {
        private readonly IExportService _exportService;
        private readonly UniClubDbContext _db;

        public ExportController(IExportService exportService, UniClubDbContext db)
        {
            _exportService = exportService;
            _db = db;
        }

        /// <summary>
        /// Export danh sách thành viên. format: xlsx (mặc định) hoặc csv
        /// </summary>
        [HttpGet("members/export")]
        public async Task<IActionResult> ExportMembers(
            int clubId,
            [FromQuery] string format = "xlsx"
        )
        {
            var authResult = await AuthorizeClubAsync(clubId);
            if (authResult != null)
                return authResult;

            try
            {
                var (content, contentType, fileName) = await _exportService.ExportMembersAsync(
                    clubId,
                    format.ToLower()
                );
                return File(content, contentType, fileName);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// Export danh sách đơn đăng ký. format: xlsx (mặc định) hoặc csv. status: Pending/Interview/Accepted/Rejected (tuỳ chọn)
        /// </summary>
        [HttpGet("applications/export")]
        public async Task<IActionResult> ExportApplications(
            int clubId,
            [FromQuery] string format = "xlsx",
            [FromQuery] string? status = null
        )
        {
            var authResult = await AuthorizeClubAsync(clubId);
            if (authResult != null)
                return authResult;

            try
            {
                var (content, contentType, fileName) = await _exportService.ExportApplicationsAsync(
                    clubId,
                    status,
                    format.ToLower()
                );
                return File(content, contentType, fileName);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("/api/admin/export/users")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> ExportAllUsers([FromQuery] string format = "xlsx")
        {
            var (content, contentType, fileName) = await _exportService.ExportAllUsersAsync(format.ToLower());
            return File(content, contentType, fileName);
        }

        [HttpGet("/api/admin/export/clubs")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> ExportAllClubs([FromQuery] string format = "xlsx")
        {
            var (content, contentType, fileName) = await _exportService.ExportAllClubsAsync(format.ToLower());
            return File(content, contentType, fileName);
        }

        // Kiểm tra quyền: CLUB_ADMIN của CLB hoặc SUPER_ADMIN
        private async Task<IActionResult?> AuthorizeClubAsync(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN"))
                return null;

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                m.UserId == userId
                && m.ClubId == clubId
                && m.ClubRole == UniClub_Hub.Shared.Enums.ClubRole.CLUB_ADMIN
                && m.Status == MembershipStatus.Active
            );

            return isClubAdmin ? null : Forbid();
        }
    }
}
