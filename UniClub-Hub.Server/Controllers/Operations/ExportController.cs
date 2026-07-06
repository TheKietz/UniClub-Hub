using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/export")]
    [Authorize]
    public class ExportController(IExportService exportService) : ControllerBase
    {
        // GET /api/v1/operations/export/tasks?clubId=&from=&to=&format=xlsx|pdf
        [HttpGet("tasks")]
        public async Task<IActionResult> ExportTasks(
            [FromQuery] int clubId,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] string format = "xlsx")
        {
            try
            {
                var (content, contentType, fileName) = await exportService.ExportTasksAsync(
                    clubId, from, to, format.ToLower(), Requester());
                return File(content, contentType, fileName);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        // GET /api/v1/operations/export/kpi/departments/{departmentId}?clubId=&from=&to=
        [HttpGet("kpi/departments/{departmentId:int}")]
        public async Task<IActionResult> ExportDepartmentKpi(
            int departmentId,
            [FromQuery] int clubId,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            try
            {
                var (content, contentType, fileName) = await exportService.ExportDepartmentKpiAsync(
                    departmentId, clubId, from, to, Requester());
                return File(content, contentType, fileName);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        // GET /api/v1/operations/export/audit-logs?clubId=&from=&to=
        [HttpGet("audit-logs")]
        public async Task<IActionResult> ExportAuditLogs(
            [FromQuery] int clubId,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            try
            {
                var (content, contentType, fileName) = await exportService.ExportAuditLogsAsync(
                    clubId, from, to, Requester());
                return File(content, contentType, fileName);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        private string Requester() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }
}
