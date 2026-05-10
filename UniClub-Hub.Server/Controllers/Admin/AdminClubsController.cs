using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/clubs")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class AdminClubsController : ControllerBase
    {
        private readonly IClubService _clubService;

        public AdminClubsController(IClubService clubService)
        {
            _clubService = clubService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? categoryId,
            [FromQuery] string? status)
        {
            var result = await _clubService.GetAllAdminAsync(categoryId, status);
            return Ok(ApiResponse<IEnumerable<AdminClubDto>>.Ok(result));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await _clubService.GetByIdAdminAsync(id);
                return Ok(ApiResponse<AdminClubDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateClubDto dto)
        {
            try
            {
                var result = await _clubService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id },
                    ApiResponse<AdminClubDto>.Ok(result, "Tạo CLB thành công."));
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

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateClubDto dto)
        {
            try
            {
                var result = await _clubService.UpdateAsync(id, dto);
                return Ok(ApiResponse<AdminClubDto>.Ok(result, "Cập nhật CLB thành công."));
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

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _clubService.DeleteAsync(id);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa CLB thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
