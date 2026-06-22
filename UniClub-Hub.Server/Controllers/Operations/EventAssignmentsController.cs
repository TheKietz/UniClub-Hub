using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/assignments")]
    [Authorize]
    public class EventAssignmentsController(
        IEventAssignmentService assignmentService,
        INotificationService notificationService,
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

                await NotifyClubAdminsAsync(clubId, result.EventName ?? $"Sự kiện #{eventId}", title);

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

        private async Task NotifyClubAdminsAsync(int clubId, string eventName, string assignmentTitle)
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
                        NotificationType.Task);
                }
            }
            catch
            {
                // Non-fatal
            }
        }
    }

    public class UpdateAssignmentStatusDto
    {
        public string Status { get; set; } = "Pending";
    }
}
