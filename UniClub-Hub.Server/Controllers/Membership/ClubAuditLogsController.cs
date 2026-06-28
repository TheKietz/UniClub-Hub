using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Authorize]
    public class ClubAuditLogsController(
        IClubAuditLogService auditLogService) : ControllerBase
    {
        [HttpGet("api/clubs/{clubId}/audit-logs")]
        public async Task<IActionResult> GetByClub(
            int clubId,
            [FromQuery] string? module,
            [FromQuery] string? search,
            [FromQuery] string? action,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] string sortBy = "timestamp",
            [FromQuery] string sortDir = "desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");
            try
            {
                var result = await auditLogService.GetByClubAsync(clubId, userId, isSuperAdmin, module, search, action, dateFrom, dateTo, sortBy, sortDir, page, pageSize);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpGet("api/admin/audit-logs")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? module,
            [FromQuery] string? search,
            [FromQuery] string? action,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] string sortBy = "timestamp",
            [FromQuery] string sortDir = "desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await auditLogService.GetAllAsync(module, search, action, dateFrom, dateTo, sortBy, sortDir, page, pageSize);
            return Ok(ApiResponse<object>.Ok(result));
        }
    }
}
