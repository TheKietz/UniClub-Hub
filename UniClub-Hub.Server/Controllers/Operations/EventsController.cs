using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Operations.DTOs.Event;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Operations
{
    [ApiController]
    [Route("api/v1/operations/events")]
    public class EventsController(IEventService eventService) : ControllerBase
    {
        // ── Event CRUD ───────────────────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? clubId,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await eventService.GetAllAsync(clubId, status, search, page, pageSize);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await eventService.GetByIdAsync(id);
                return Ok(ApiResponse<EventDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromQuery] int? clubId, [FromBody] CreateEventDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await eventService.CreateAsync(clubId, dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id },
                    ApiResponse<EventDto>.Ok(result, "Tạo sự kiện thành công."));
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

        [HttpPut("{id:int}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateEventDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await eventService.UpdateAsync(id, dto, userId);
                return Ok(ApiResponse<EventDto>.Ok(result, "Cập nhật thành công."));
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

        [HttpDelete("{id:int}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await eventService.DeleteAsync(id, userId);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa sự kiện thành công."));
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

        // ── Sessions ─────────────────────────────────────────────────────────

        [HttpGet("{id:int}/sessions")]
        public async Task<IActionResult> GetSessions(int id)
        {
            var result = await eventService.GetSessionsAsync(id);
            return Ok(ApiResponse<List<EventSessionDto>>.Ok(result));
        }

        [HttpPost("{id:int}/sessions")]
        [Authorize]
        public async Task<IActionResult> AddSession(int id, [FromBody] CreateEventSessionDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await eventService.AddSessionAsync(id, dto, userId);
                return Ok(ApiResponse<EventSessionDto>.Ok(result, "Thêm phiên thành công."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}/sessions/{sessionId:int}")]
        [Authorize]
        public async Task<IActionResult> DeleteSession(int id, int sessionId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await eventService.DeleteSessionAsync(id, sessionId, userId);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa phiên thành công."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPatch("{id:int}/sessions/reorder")]
        [Authorize]
        public async Task<IActionResult> ReorderSessions(int id, [FromBody] ReorderEventSessionsDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await eventService.ReorderSessionsAsync(id, dto.OrderedIds, userId);
                return Ok(ApiResponse<object>.Ok(null!, "Sắp xếp thành công."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        // ── Staff ─────────────────────────────────────────────────────────────

        [HttpGet("{id:int}/staff")]
        public async Task<IActionResult> GetStaff(int id)
        {
            var result = await eventService.GetStaffAsync(id);
            return Ok(ApiResponse<List<EventStaffDto>>.Ok(result));
        }

        [HttpPost("{id:int}/staff")]
        [Authorize]
        public async Task<IActionResult> AssignStaff(int id, [FromBody] AssignEventStaffDto dto)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await eventService.AssignStaffAsync(id, dto, actorId);
                return Ok(ApiResponse<EventStaffDto>.Ok(result, "Phân công thành công."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}/staff/{userId}")]
        [Authorize]
        public async Task<IActionResult> RemoveStaff(int id, string userId)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await eventService.RemoveStaffAsync(id, userId, actorId);
                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa nhân sự."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Registrations ─────────────────────────────────────────────────────

        [HttpGet("{id:int}/registrations")]
        [Authorize]
        public async Task<IActionResult> GetRegistrations(int id)
        {
            var result = await eventService.GetRegistrationsAsync(id);
            return Ok(ApiResponse<List<EventRegistrationDto>>.Ok(result));
        }

        [HttpPost("{id:int}/registrations")]
        [Authorize]
        public async Task<IActionResult> RegisterMember(int id, [FromBody] RegisterMemberDto dto)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await eventService.RegisterMemberAsync(id, dto, actorId);
                return Ok(ApiResponse<EventRegistrationDto>.Ok(result, "Đã thêm người tham gia."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex)
            {
                return Conflict(ApiResponse<object>.Fail(ex.Message));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}/registrations/{userId}")]
        [Authorize]
        public async Task<IActionResult> RemoveRegistration(int id, string userId)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await eventService.RemoveRegistrationAsync(id, userId, actorId);
                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa người tham gia."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPatch("{id:int}/registrations/{userId}/attendance")]
        [Authorize]
        public async Task<IActionResult> UpdateAttendance(int id, string userId, [FromBody] UpdateAttendanceDto dto)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await eventService.UpdateAttendanceAsync(id, userId, dto, actorId);
                return Ok(ApiResponse<object>.Ok(null!, "Cập nhật điểm danh thành công."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Attachments ───────────────────────────────────────────────────────

        [HttpGet("{id:int}/attachments")]
        public async Task<IActionResult> GetAttachments(int id)
        {
            var result = await eventService.GetAttachmentsAsync(id);
            return Ok(ApiResponse<List<EventAttachmentDto>>.Ok(result));
        }

        [HttpPost("{id:int}/attachments")]
        [Authorize]
        public async Task<IActionResult> UploadAttachment(int id, IFormFile file, [FromForm] string? note)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await eventService.UploadAttachmentAsync(id, file, note, actorId);
                return Ok(ApiResponse<EventAttachmentDto>.Ok(result, "Tải lên thành công."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}/attachments/{attachmentId:int}")]
        [Authorize]
        public async Task<IActionResult> DeleteAttachment(int id, int attachmentId)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await eventService.DeleteAttachmentAsync(id, attachmentId, actorId);
                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa tệp đính kèm."));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Registration Link ─────────────────────────────────────────────────

        [HttpGet("{id:int}/registration-link")]
        public async Task<IActionResult> GetRegistrationLink(int id)
        {
            var link = await eventService.GetRegistrationLinkAsync(id);
            return Ok(ApiResponse<string?>.Ok(link));
        }

        [HttpPut("{id:int}/registration-link")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> UpsertRegistrationLink(int id, [FromBody] SetRegistrationLinkDto dto)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            await eventService.UpsertRegistrationLinkAsync(id, dto.Url, actorId);
            return Ok(ApiResponse<object>.Ok(null!, string.IsNullOrWhiteSpace(dto.Url) ? "Đã xóa link đăng ký." : "Đã lưu link đăng ký."));
        }
    }
}
