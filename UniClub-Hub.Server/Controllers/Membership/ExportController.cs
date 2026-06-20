using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}")]
    [Authorize]
    public class ExportController : ControllerBase
    {
        private readonly IExportService _exportService;
        private readonly IClubPermissionService _permissions;

        public ExportController(IExportService exportService, IClubPermissionService permissions)
        {
            _exportService = exportService;
            _permissions = permissions;
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
            var authResult = await AuthorizeClubAsync(clubId, ClubPermissions.MemberImportExport);
            if (authResult != null)
                return authResult;

            try
            {
                var (content, contentType, fileName) = await _exportService.ExportMembersAsync(
                    clubId,
                    format.ToLower(),
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
            var authResult = await AuthorizeClubAsync(clubId, ClubPermissions.ApplicationsView);
            if (authResult != null)
                return authResult;

            try
            {
                var (content, contentType, fileName) = await _exportService.ExportApplicationsAsync(
                    clubId,
                    status,
                    format.ToLower(),
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

        private async Task<IActionResult?> AuthorizeClubAsync(int clubId, string permissionCode)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");
            return await _permissions.HasPermissionAsync(clubId, userId, isSuperAdmin, permissionCode)
                ? null
                : Forbid();
        }
    }
}
