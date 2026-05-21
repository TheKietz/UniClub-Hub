using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/v1/membership/clubs/{clubId}/audit-logs")]
    [Authorize]
    public class ClubAuditLogsController(IClubAuditLogService auditLogService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll(
            int clubId,
            [FromQuery] string? module,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var result = await auditLogService.GetByClubAsync(clubId, module, page, pageSize);
            return Ok(ApiResponse<object>.Ok(result));
        }
    }
}
