using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Pipeline;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/pipeline")]
    [Authorize]
    public class PipelineController : ControllerBase
    {
        private readonly IPipelineService _pipeline;

        public PipelineController(IPipelineService pipeline)
        {
            _pipeline = pipeline;
        }

        [HttpGet("stages")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStages(int clubId)
        {
            try
            {
                var result = await _pipeline.GetStagesAsync(clubId);
                return Ok(ApiResponse<IEnumerable<PipelineStageDto>>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("stages")]
        public async Task<IActionResult> CreateStage(int clubId, [FromBody] CreatePipelineStageRequest req)
        {
            var (userId, isSuperAdmin) = GetRequester();

            try
            {
                var result = await _pipeline.CreateStageAsync(clubId, req, userId, isSuperAdmin);
                return Ok(ApiResponse<PipelineStageDto>.Ok(result, "Đã thêm vòng tuyển."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("stages/{stageId}")]
        public async Task<IActionResult> UpdateStage(int clubId, int stageId, [FromBody] UpdatePipelineStageRequest req)
        {
            var (userId, isSuperAdmin) = GetRequester();

            try
            {
                var result = await _pipeline.UpdateStageAsync(clubId, stageId, req, userId, isSuperAdmin);
                return Ok(ApiResponse<PipelineStageDto>.Ok(result, "Đã cập nhật vòng tuyển."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("stages/{stageId}")]
        public async Task<IActionResult> DeleteStage(int clubId, int stageId)
        {
            var (userId, isSuperAdmin) = GetRequester();

            try
            {
                await _pipeline.DeleteStageAsync(clubId, stageId, userId, isSuperAdmin);
                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa vòng tuyển."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("stages/reorder")]
        public async Task<IActionResult> Reorder(int clubId, [FromBody] ReorderStagesRequest req)
        {
            var (userId, isSuperAdmin) = GetRequester();

            try
            {
                await _pipeline.ReorderAsync(clubId, req, userId, isSuperAdmin);
                return Ok(ApiResponse<object>.Ok(null!, "Đã cập nhật thứ tự."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        private (string UserId, bool IsSuperAdmin) GetRequester() =>
            (User.FindFirstValue(ClaimTypes.NameIdentifier)!, User.IsInRole("SUPER_ADMIN"));
    }
}
