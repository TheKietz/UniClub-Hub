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
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int clubId,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await eventService.GetAllAsync(clubId, status, page, pageSize);
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
    }
}
