using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Operations.DTOs.Sprint;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/sprints")]
    [Authorize]
    public class SprintsController(ISprintService sprintService) : ControllerBase
    {
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            [FromQuery] int clubId,
            [FromQuery] int? eventId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await sprintService.GetByClubAsync(clubId, eventId, page, pageSize);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await sprintService.GetByIdAsync(id);
                return Ok(ApiResponse<SprintDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost]
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> Create([FromQuery] int clubId, [FromBody] CreateSprintDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await sprintService.CreateAsync(clubId, dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id },
                    ApiResponse<SprintDto>.Ok(result, "Tạo sprint thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSprintDto dto)
        {
            try
            {
                var result = await sprintService.UpdateAsync(id, dto);
                return Ok(ApiResponse<SprintDto>.Ok(result, "Cập nhật thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await sprintService.DeleteAsync(id);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa sprint thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
