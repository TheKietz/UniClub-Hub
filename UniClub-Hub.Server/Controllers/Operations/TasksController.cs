using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Operations.DTOs.Intelligence;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
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
        IHubContext<KanbanHub> hubContext,
        ITaskCommentService commentService,
        ITaskAttachmentService attachmentService,
        ITaskIntelligenceService intelligenceService,
        UniClub_Hub.Shared.Common.Interfaces.INotificationService notificationService,
        UniClubDbContext db) : ControllerBase
    {
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? clubId,
            [FromQuery] string? status,
            [FromQuery] int? sprintId,
            [FromQuery] int? eventId,
            [FromQuery] string? assignedTo,
            [FromQuery] int? parentId,
            [FromQuery] int? departmentId,
            [FromQuery] bool? unassigned,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var result = await taskService.GetByClubAsync(clubId, status, sprintId, eventId, assignedTo, parentId, departmentId, page, pageSize, unassigned);
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

                // Notify dept lead when task is sent to a department
                if (result.DepartmentId.HasValue)
                    await NotifyDeptLeadAsync(result.DepartmentId.Value, result.ClubId, result.Id, result.Title, result.EventId, userId, result.AssignedTo);

                return CreatedAtAction(nameof(GetById), new { id = result.Id },
                    ApiResponse<TaskDto>.Ok(result, "Tạo công việc thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        private async Task NotifyDeptLeadAsync(int departmentId, int clubId, int taskId, string taskTitle, int? eventId, string creatorId, string? assignedTo)
        {
            var lead = await db.ClubMemberships
                .AsNoTracking()
                .Where(m => m.DepartmentId == departmentId
                         && m.ClubId == clubId
                         && m.ClubRole == ClubRole.DEPT_LEAD
                         && m.Status == MembershipStatus.Active)
                .Select(m => m.UserId)
                .FirstOrDefaultAsync();

            // Skip if there's no lead, or the lead is the creator (don't notify yourself),
            // or the lead is already the assignee (TaskService.CreateAsync notifies them).
            if (lead == null || lead == creatorId || lead == assignedTo) return;

            var eventSuffix = eventId.HasValue ? $" (thuộc sự kiện #{eventId})" : string.Empty;
            await notificationService.SendAsync(
                lead,
                "Công việc mới được giao về Ban",
                $"Bạn có công việc mới cần xử lý: \"{taskTitle}\"{eventSuffix}.",
                NotificationType.TaskAssigned,
                relatedEntityType: "Task",
                relatedEntityId: taskId);
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
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var task = await taskService.GetByIdAsync(id);
                await taskService.DeleteAsync(id, userId);
                await hubContext.Clients
                    .Group(SignalRGroups.Club(task.ClubId))
                    .SendAsync(SignalREvents.TaskDeleted, id);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa công việc thành công."));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
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

        // ── Intelligence ──────────────────────────────────────────────────────────

        /// <summary>Feature 1 – Gợi ý phân công: top 3 thành viên phù hợp nhất.</summary>
        [HttpGet("suggest-assignees")]
        [AllowAnonymous]
        public async Task<IActionResult> SuggestAssignees(
            [FromQuery] int clubId,
            [FromQuery] int departmentId,
            [FromQuery] float? estimatedHours,
            [FromQuery] string priority = "Medium",
            [FromQuery] int? sprintId = null)
        {
            if (!Enum.TryParse<TaskPriority>(priority, true, out var parsedPriority))
                parsedPriority = TaskPriority.Medium;

            var result = await intelligenceService.SuggestAssigneesAsync(
                clubId, departmentId, estimatedHours, parsedPriority, sprintId);
            return Ok(ApiResponse<List<AssignmentSuggestionResponse>>.Ok(result));
        }

        /// <summary>Feature 3 – Đề xuất ưu tiên: top 3 công việc khẩn cấp nhất của thành viên.</summary>
        [HttpGet("urgent-tasks")]
        public async Task<IActionResult> GetUrgentTasks(
            [FromQuery] int clubId,
            [FromQuery] int? departmentId = null,
            [FromQuery] int? sprintId = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await intelligenceService.GetUrgentTasksAsync(userId, clubId, departmentId, sprintId);
            return Ok(ApiResponse<List<UrgentTaskResponse>>.Ok(result));
        }

        // ── Comments ──────────────────────────────────────────────────────────────

        [HttpGet("{id:int}/comments")]
        [AllowAnonymous]
        public async Task<IActionResult> GetComments(int id)
        {
            var result = await commentService.GetByTaskAsync(id);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPost("{id:int}/comments")]
        public async Task<IActionResult> AddComment(int id, [FromBody] CreateTaskCommentDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await commentService.AddAsync(id, userId, dto);
                return Ok(ApiResponse<TaskCommentDto>.Ok(result, "Thêm bình luận thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("{id:int}/comments/{commentId:int}")]
        public async Task<IActionResult> UpdateComment(int id, int commentId, [FromBody] UpdateTaskCommentDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await commentService.UpdateAsync(commentId, userId, dto);
                return Ok(ApiResponse<TaskCommentDto>.Ok(result));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        [HttpDelete("{id:int}/comments/{commentId:int}")]
        public async Task<IActionResult> DeleteComment(int id, int commentId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await commentService.DeleteAsync(commentId, userId);
                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa bình luận."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        // ── Attachments ───────────────────────────────────────────────────────────

        [HttpGet("{id:int}/attachments")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAttachments(int id)
        {
            var result = await attachmentService.GetByTaskAsync(id);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPost("{id:int}/attachments/link")]
        public async Task<IActionResult> AddLink(int id, [FromBody] AddTaskAttachmentLinkDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await attachmentService.AddLinkAsync(id, userId, dto);
            return Ok(ApiResponse<TaskAttachmentDto>.Ok(result, "Thêm liên kết thành công."));
        }

        [HttpPost("{id:int}/attachments/file")]
        public async Task<IActionResult> UploadFile(int id, IFormFile file, [FromForm] string? note)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await attachmentService.UploadFileAsync(id, userId, file, note);
                return Ok(ApiResponse<TaskAttachmentDto>.Ok(result, "Tải lên thành công."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpDelete("{id:int}/attachments/{attachmentId:int}")]
        public async Task<IActionResult> DeleteAttachment(int id, int attachmentId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await attachmentService.DeleteAsync(attachmentId, userId);
                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa đính kèm."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }
    }
}
