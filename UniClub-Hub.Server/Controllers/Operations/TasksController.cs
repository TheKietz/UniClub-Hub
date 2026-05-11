using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Server.Hubs;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/tasks")]
    [Authorize]
    public class TasksController(
        ITaskService taskService,
        IHubContext<KanbanHub> hubContext) : ControllerBase
    {
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            [FromQuery] int clubId,
            [FromQuery] string? status,
            [FromQuery] int? sprintId,
            [FromQuery] int? eventId,
            [FromQuery] string? assignedTo,
            [FromQuery] int? parentId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var result = await taskService.GetByClubAsync(clubId, status, sprintId, eventId, assignedTo, parentId, page, pageSize);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await taskService.GetByIdAsync(id);
                return Ok(ApiResponse<TaskDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromQuery] int clubId, [FromBody] CreateTaskDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await taskService.CreateAsync(clubId, dto, userId);
                await hubContext.Clients
                    .Group(SignalRGroups.Club(result.ClubId))
                    .SendAsync(SignalREvents.TaskCreated, result);
                return CreatedAtAction(nameof(GetById), new { id = result.Id },
                    ApiResponse<TaskDto>.Ok(result, "Tạo công việc thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTaskDto dto)
        {
            try
            {
                var result = await taskService.UpdateAsync(id, dto);
                return Ok(ApiResponse<TaskDto>.Ok(result, "Cập nhật thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTaskStatusDto dto)
        {
            try
            {
                var result = await taskService.UpdateStatusAsync(id, dto);
                await hubContext.Clients
                    .Group(SignalRGroups.Club(result.ClubId))
                    .SendAsync(SignalREvents.TaskStatusUpdated, result);
                return Ok(ApiResponse<TaskDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var task = await taskService.GetByIdAsync(id);
                await taskService.DeleteAsync(id);
                await hubContext.Clients
                    .Group(SignalRGroups.Club(task.ClubId))
                    .SendAsync(SignalREvents.TaskDeleted, id);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa công việc thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Dependencies ──────────────────────────────────────────────────────────

        [HttpGet("{id:int}/dependencies")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDependencies(int id)
        {
            try
            {
                var result = await taskService.GetDependenciesAsync(id);
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("{id:int}/dependencies")]
        public async Task<IActionResult> AddDependency(int id, [FromBody] AddDependencyDto dto)
        {
            try
            {
                await taskService.AddDependencyAsync(id, dto);
                return Ok(ApiResponse<object>.Ok(null!, "Thêm phụ thuộc thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}/dependencies/{dependsOnId:int}")]
        public async Task<IActionResult> RemoveDependency(int id, int dependsOnId)
        {
            try
            {
                await taskService.RemoveDependencyAsync(id, dependsOnId);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa phụ thuộc thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
