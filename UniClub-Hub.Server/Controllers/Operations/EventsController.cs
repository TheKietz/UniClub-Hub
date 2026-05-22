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
            [FromQuery] int clubId,
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
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> Create([FromQuery] int clubId, [FromBody] CreateEventDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await eventService.CreateAsync(clubId, dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id },
                    ApiResponse<EventDto>.Ok(result, "Tạo sự kiện thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateEventDto dto)
        {
            try
            {
                var result = await eventService.UpdateAsync(id, dto);
                return Ok(ApiResponse<EventDto>.Ok(result, "Cập nhật thành công."));
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
                await eventService.DeleteAsync(id);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa sự kiện thành công."));
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
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> AddSession(int id, [FromBody] CreateEventSessionDto dto)
        {
            try
            {
                var result = await eventService.AddSessionAsync(id, dto);
                return Ok(ApiResponse<EventSessionDto>.Ok(result, "Thêm phiên thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}/sessions/{sessionId:int}")]
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> DeleteSession(int id, int sessionId)
        {
            try
            {
                await eventService.DeleteSessionAsync(id, sessionId);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa phiên thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPatch("{id:int}/sessions/reorder")]
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> ReorderSessions(int id, [FromBody] ReorderEventSessionsDto dto)
        {
            await eventService.ReorderSessionsAsync(id, dto.OrderedIds);
            return Ok(ApiResponse<object>.Ok(null!, "Sắp xếp thành công."));
        }

        // ── Staff ─────────────────────────────────────────────────────────────

        [HttpGet("{id:int}/staff")]
        public async Task<IActionResult> GetStaff(int id)
        {
            var result = await eventService.GetStaffAsync(id);
            return Ok(ApiResponse<List<EventStaffDto>>.Ok(result));
        }

        [HttpPost("{id:int}/staff")]
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> AssignStaff(int id, [FromBody] AssignEventStaffDto dto)
        {
            try
            {
                var result = await eventService.AssignStaffAsync(id, dto);
                return Ok(ApiResponse<EventStaffDto>.Ok(result, "Phân công thành công."));
            }
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
        [Authorize(Roles = "CLUB_ADMIN,SUPER_ADMIN")]
        public async Task<IActionResult> RemoveStaff(int id, string userId)
        {
            try
            {
                await eventService.RemoveStaffAsync(id, userId);
                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa nhân sự."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
