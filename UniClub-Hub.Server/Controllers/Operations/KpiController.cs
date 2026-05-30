using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/kpi")]
    [Authorize]
    public class KpiController(IKpiService kpiService) : ControllerBase
    {
        [HttpGet("me")]
        public async Task<IActionResult> GetPersonalKpi(
            [FromQuery] int clubId,
            [FromQuery] int? departmentId,
            [FromQuery] int? sprintId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await kpiService.GetPersonalKpiAsync(userId, clubId, departmentId, sprintId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpGet("departments/{departmentId:int}")]
        public async Task<IActionResult> GetDepartmentKpi(
            int departmentId,
            [FromQuery] int clubId,
            [FromQuery] int? sprintId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await kpiService.GetDepartmentKpiAsync(departmentId, clubId, userId, sprintId);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
        }
    }
}
