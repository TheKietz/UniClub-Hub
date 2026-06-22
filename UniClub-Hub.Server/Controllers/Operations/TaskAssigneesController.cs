using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/tasks/{taskId:int}/assignees")]
    [Authorize]
    public class TaskAssigneesController(ITaskAssigneeService assigneeService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll(int taskId)
        {
            var result = await assigneeService.GetAsync(taskId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPost]
        public async Task<IActionResult> Assign(int taskId, [FromBody] AssignTaskDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await assigneeService.AssignAsync(taskId, dto.UserId, userId);
                return Ok(ApiResponse<TaskAssigneeDto>.Ok(result, "Đã gán thành viên."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{userId}")]
        public async Task<IActionResult> Unassign(int taskId, string userId)
        {
            await assigneeService.UnassignAsync(taskId, userId);
            return Ok(ApiResponse<object>.Ok(null!, "Đã gỡ thành viên."));
        }
    }
}
