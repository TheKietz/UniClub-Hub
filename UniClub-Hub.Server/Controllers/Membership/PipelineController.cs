using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Pipeline;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/pipeline")]
    [Authorize]
    public class PipelineController : ControllerBase
    {
        private readonly IPipelineService _pipeline;
        private readonly UniClubDbContext _db;

        public PipelineController(IPipelineService pipeline, UniClubDbContext db)
        {
            _pipeline = pipeline;
            _db = db;
        }

        private async Task<bool> IsClubAdminAsync(int clubId, string userId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            return await _db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId && m.UserId == userId &&
                m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);
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
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (!await IsClubAdminAsync(clubId, userId)) return Forbid();

            try
            {
                var result = await _pipeline.CreateStageAsync(clubId, req);
                return Ok(ApiResponse<PipelineStageDto>.Ok(result, "Đã thêm vòng tuyển."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("stages/{stageId}")]
        public async Task<IActionResult> UpdateStage(int clubId, int stageId, [FromBody] UpdatePipelineStageRequest req)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (!await IsClubAdminAsync(clubId, userId)) return Forbid();

            try
            {
                var result = await _pipeline.UpdateStageAsync(clubId, stageId, req);
                return Ok(ApiResponse<PipelineStageDto>.Ok(result, "Đã cập nhật vòng tuyển."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("stages/{stageId}")]
        public async Task<IActionResult> DeleteStage(int clubId, int stageId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (!await IsClubAdminAsync(clubId, userId)) return Forbid();

            try
            {
                await _pipeline.DeleteStageAsync(clubId, stageId);
                return Ok(ApiResponse<object>.Ok(null, "Đã xóa vòng tuyển."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("stages/reorder")]
        public async Task<IActionResult> Reorder(int clubId, [FromBody] ReorderStagesRequest req)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (!await IsClubAdminAsync(clubId, userId)) return Forbid();

            await _pipeline.ReorderAsync(clubId, req);
            return Ok(ApiResponse<object>.Ok(null, "Đã cập nhật thứ tự."));
        }
    }
}
