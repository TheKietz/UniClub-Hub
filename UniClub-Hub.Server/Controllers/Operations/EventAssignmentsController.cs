using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Server.Hubs;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/assignments")]
    [Authorize]
    public class EventAssignmentsController(
        IEventAssignmentService assignmentService,
        UniClub_Hub.Shared.Common.Interfaces.INotificationService notificationService,
        IHubContext<KanbanHub> hubContext,
        UniClubDbContext db) : ControllerBase
    {
        // GET /api/v1/operations/assignments?eventId=X
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetByEvent([FromQuery] int eventId)
        {
            var result = await assignmentService.GetByEventAsync(eventId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET /api/v1/operations/assignments/inbox?clubId=X
        [HttpGet("inbox")]
        [AllowAnonymous]
        public async Task<IActionResult> GetInbox([FromQuery] int clubId)
        {
            var result = await assignmentService.GetByClubAsync(clubId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Create(
            [FromQuery] int eventId,
            [FromQuery] int clubId,
            [FromForm] string title,
            [FromForm] string? description = null,
            [FromForm] string priority = "Medium",
            [FromForm] string? deadline = null)
        {
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(ApiResponse<object>.Fail("Tên phiếu giao việc không được để trống."));

            if (!Enum.TryParse<TaskPriority>(priority, true, out var parsedPriority))
                parsedPriority = TaskPriority.Medium;

            DateTimeOffset? parsedDeadline = null;
            if (!string.IsNullOrEmpty(deadline) && DateTimeOffset.TryParse(deadline, out var dl))
                parsedDeadline = dl.ToUniversalTime();

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var files = Request.Form.Files.Count > 0 ? Request.Form.Files : null;

            try
            {
                var result = await assignmentService.CreateAsync(
                    eventId, clubId, title, description,
                    parsedPriority, parsedDeadline, actorId, files);

                await NotifyClubAdminsAsync(clubId, result.Id, result.EventName ?? $"Sự kiện #{eventId}", title);

                // Realtime: let the receiving club's open inbox/board update live.
                await hubContext.Clients
                    .Group(SignalRGroups.Club(clubId))
                    .SendAsync(SignalREvents.AssignmentReceived, result);

                return CreatedAtAction(nameof(GetByEvent), new { eventId },
                    ApiResponse<object>.Ok(result, "Phiếu giao việc đã được tạo."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateAssignmentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(ApiResponse<object>.Fail("Tên phiếu giao việc không được để trống."));

            if (!Enum.TryParse<TaskPriority>(dto.Priority, true, out var parsedPriority))
                parsedPriority = TaskPriority.Medium;

            DateTimeOffset? parsedDeadline = null;
            if (!string.IsNullOrEmpty(dto.Deadline) && DateTimeOffset.TryParse(dto.Deadline, out var dl))
                parsedDeadline = dl.ToUniversalTime();

            try
            {
                var result = await assignmentService.UpdateAsync(id, dto.Title, dto.Description, parsedPriority, parsedDeadline);
                return Ok(ApiResponse<object>.Ok(result, "Đã cập nhật phiếu giao việc."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("{id:int}/attachments")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> AddAttachments(int id)
        {
            var files = Request.Form.Files;
            if (files.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("Vui lòng chọn file để tải lên."));
            try
            {
                var result = await assignmentService.AddAttachmentsAsync(id, files);
                return Ok(ApiResponse<object>.Ok(result, "Đã tải lên file."));
            }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpDelete("{id:int}/attachments")]
        public async Task<IActionResult> RemoveAttachment(int id, [FromQuery] string url)
        {
            try
            {
                var result = await assignmentService.RemoveAttachmentAsync(id, url);
                return Ok(ApiResponse<object>.Ok(result, "Đã xóa file đính kèm."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateAssignmentStatusDto dto)
        {
            try
            {
                var result = await assignmentService.UpdateStatusAsync(id, dto.Status);
                return Ok(ApiResponse<object>.Ok(result));
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
                await assignmentService.DeleteAsync(id);
                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa phiếu giao việc."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        private async Task NotifyClubAdminsAsync(int clubId, int assignmentId, string eventName, string assignmentTitle)
        {
            try
            {
                var adminIds = await db.ClubMemberships
                    .AsNoTracking()
                    .Where(m => m.ClubId == clubId
                             && m.ClubRole == ClubRole.CLUB_ADMIN
                             && m.Status == MembershipStatus.Active)
                    .Select(m => m.UserId)
                    .ToListAsync();

                foreach (var uid in adminIds)
                {
                    await notificationService.SendAsync(
                        uid,
                        "Phiếu giao việc mới từ Admin trường",
                        $"Sự kiện \"{eventName}\" có phiếu giao việc mới: \"{assignmentTitle}\". Vào Hộp thư để xử lý.",
                        NotificationType.AssignmentReceived,
                        relatedEntityType: "Assignment",
                        relatedEntityId: assignmentId);
                }
            }
            catch
            {
                // Non-fatal
            }
        }
    }

    public class UpdateAssignmentDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Priority { get; set; } = "Medium";
        public string? Deadline { get; set; }
    }

    public class UpdateAssignmentStatusDto
    {
        public string Status { get; set; } = "Pending";
    }
}
