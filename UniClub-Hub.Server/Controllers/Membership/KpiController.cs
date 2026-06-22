using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Kpi;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId:int}/kpi")]
    [Authorize]
    public class KpiController : ControllerBase
    {
        private readonly IKpiService _kpiService;

        public KpiController(IKpiService kpiService)
        {
            _kpiService = kpiService;
        }

        [HttpGet("config")]
        public async Task<IActionResult> GetConfig(int clubId)
        {
            try
            {
                var result = await _kpiService.GetOrCreateConfigAsync(
                    clubId,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );
                return Ok(ApiResponse<KpiConfigDto>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPut("config/criteria")]
        public async Task<IActionResult> UpdateCriteria(int clubId, [FromBody] List<UpdateKpiCriteriaDto> criteria)
        {
            try
            {
                var result = await _kpiService.UpdateCriteriaAsync(
                    clubId,
                    criteria,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );
                return Ok(ApiResponse<KpiConfigDto>.Ok(result, "Cập nhật tiêu chí KPI thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPatch("config/criteria/{metricKey}")]
        public async Task<IActionResult> ToggleCriteria(
            int clubId,
            KpiMetricKey metricKey,
            [FromBody] ToggleKpiCriteriaDto dto
        )
        {
            try
            {
                var result = await _kpiService.ToggleCriteriaAsync(
                    clubId,
                    metricKey,
                    dto.IsEnabled,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );
                return Ok(ApiResponse<KpiConfigDto>.Ok(result, "Cập nhật trạng thái tiêu chí KPI thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPut("config/grades")]
        public async Task<IActionResult> UpdateGrades(int clubId, [FromBody] UpdateKpiGradesDto dto)
        {
            try
            {
                var result = await _kpiService.UpdateGradesAsync(
                    clubId,
                    dto,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );
                return Ok(ApiResponse<KpiConfigDto>.Ok(result, "Cập nhật xếp loại KPI thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpGet("results")]
        public async Task<IActionResult> GetResults(
            int clubId,
            [FromQuery] int? departmentId,
            [FromQuery] DateOnly? fromDate,
            [FromQuery] DateOnly? toDate
        )
        {
            try
            {
                var result = await _kpiService.GetResultsAsync(
                    clubId,
                    departmentId,
                    fromDate,
                    toDate,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );
                return Ok(ApiResponse<KpiResultsDto>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpGet("results/me")]
        public async Task<IActionResult> GetMyResult(
            int clubId,
            [FromQuery] DateOnly? fromDate,
            [FromQuery] DateOnly? toDate
        )
        {
            try
            {
                var result = await _kpiService.GetMyResultAsync(
                    clubId,
                    fromDate,
                    toDate,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );
                return Ok(ApiResponse<MemberKpiResultDto>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }
}
