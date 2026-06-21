using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}")]
    [Authorize]
    public class ExportController : ControllerBase
    {
        private readonly IExportService _exportService;

        public ExportController(IExportService exportService)
        {
            _exportService = exportService;
        }

        /// <summary>
        /// Export danh sách thành viên. format: xlsx (mặc định) hoặc csv
        /// </summary>
        [HttpGet("members/export")]
        public async Task<IActionResult> ExportMembers(
            int clubId,
            [FromQuery] string format = "xlsx",
            [FromQuery] string? search = null,
            [FromQuery] string? role = null,
            [FromQuery] string? status = null,
            [FromQuery] int? departmentId = null,
            [FromQuery] string sortBy = "name",
            [FromQuery] string sortDir = "asc"
        )
        {
            try
            {
                var (userId, isSuperAdmin) = GetRequester();
                var (content, contentType, fileName) = await _exportService.ExportMembersAsync(
                    clubId,
                    format.ToLower(),
                    userId,
                    isSuperAdmin,
                    new MemberListQuery
                    {
                        Search = search,
                        Role = role,
                        Status = status,
                        DepartmentId = departmentId,
                        SortBy = sortBy,
                        SortDir = sortDir
                    }
                );
                return File(content, contentType, fileName);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
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
            [FromQuery] string? status = null,
            [FromQuery] string? search = null,
            [FromQuery] int? stageId = null,
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            [FromQuery] string sortBy = "appliedAt",
            [FromQuery] string sortDir = "desc"
        )
        {
            try
            {
                var (userId, isSuperAdmin) = GetRequester();
                var (content, contentType, fileName) = await _exportService.ExportApplicationsAsync(
                    clubId,
                    status,
                    format.ToLower(),
                    userId,
                    isSuperAdmin,
                    new ApplicationListQuery
                    {
                        Search = search,
                        Status = status,
                        StageId = stageId,
                        DateFrom = dateFrom,
                        DateTo = dateTo,
                        SortBy = sortBy,
                        SortDir = sortDir
                    }
                );
                return File(content, contentType, fileName);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("/api/admin/export/users")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> ExportAllUsers(
            [FromQuery] string format = "xlsx",
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] string? role = null,
            [FromQuery] string sortBy = "name",
            [FromQuery] string sortDir = "asc")
        {
            var (content, contentType, fileName) = await _exportService.ExportAllUsersAsync(
                format.ToLower(),
                new UserListQuery
                {
                    Search = search,
                    Status = status,
                    Role = role,
                    SortBy = sortBy,
                    SortDir = sortDir
                });
            return File(content, contentType, fileName);
        }

        [HttpGet("/api/admin/export/clubs")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> ExportAllClubs(
            [FromQuery] string format = "xlsx",
            [FromQuery] string? search = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] string? status = null,
            [FromQuery] string sortBy = "id",
            [FromQuery] string sortDir = "asc")
        {
            var (content, contentType, fileName) = await _exportService.ExportAllClubsAsync(
                format.ToLower(),
                new AdminClubListQuery
                {
                    Search = search,
                    CategoryId = categoryId,
                    Status = status,
                    SortBy = sortBy,
                    SortDir = sortDir
                });
            return File(content, contentType, fileName);
        }

        private (string UserId, bool IsSuperAdmin) GetRequester() =>
            (User.FindFirstValue(ClaimTypes.NameIdentifier)!, User.IsInRole("SUPER_ADMIN"));
    }
}
