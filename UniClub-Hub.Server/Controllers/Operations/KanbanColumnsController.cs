using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Operations.DTOs.Kanban;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/kanban-columns")]
    [Authorize]
    public class KanbanColumnsController(IKanbanColumnService kanbanService) : ControllerBase
    {
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] int clubId, [FromQuery] int? sprintId)
        {
            var result = await kanbanService.GetByClubAsync(clubId, sprintId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromQuery] int clubId, [FromBody] CreateKanbanColumnDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await kanbanService.CreateAsync(clubId, dto, userId);
            return Ok(ApiResponse<KanbanColumnDto>.Ok(result, "Tạo cột thành công."));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateKanbanColumnDto dto)
        {
            try
            {
                var result = await kanbanService.UpdateAsync(id, dto);
                return Ok(ApiResponse<KanbanColumnDto>.Ok(result, "Cập nhật cột thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await kanbanService.DeleteAsync(id);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa cột thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPatch("reorder")]
        public async Task<IActionResult> Reorder([FromQuery] int clubId, [FromBody] ReorderKanbanColumnsDto dto)
        {
            await kanbanService.ReorderAsync(clubId, dto);
            return Ok(ApiResponse<object>.Ok(null!, "Đã cập nhật thứ tự cột."));
        }
    }
}
