using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/audit-logs")]
    [Authorize]
    public class AuditLogsController(IAuditLogService auditLogService) : ControllerBase
    {
        /// <summary>
        /// Returns a paginated audit log scoped to the given club.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int clubId,
            [FromQuery] string? module,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var result = await auditLogService.GetByClubAsync(clubId, module, page, pageSize);
            return Ok(ApiResponse<object>.Ok(result));
        }
    }
}
