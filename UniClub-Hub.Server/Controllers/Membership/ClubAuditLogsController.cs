using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Authorize]
    public class ClubAuditLogsController(IClubAuditLogService auditLogService) : ControllerBase
    {
        [HttpGet("api/clubs/{clubId}/audit-logs")]
        public async Task<IActionResult> GetByClub(
            int clubId,
            [FromQuery] string? module,
            [FromQuery] string? search,
            [FromQuery] string? action,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await auditLogService.GetByClubAsync(clubId, module, search, action, dateFrom, dateTo, page, pageSize);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpGet("api/admin/audit-logs")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? module,
            [FromQuery] string? search,
            [FromQuery] string? action,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await auditLogService.GetAllAsync(module, search, action, dateFrom, dateTo, page, pageSize);
            return Ok(ApiResponse<object>.Ok(result));
        }
    }
}
