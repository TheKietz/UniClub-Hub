using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.User;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/users")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class AdminUsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public AdminUsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _userService.GetUsersAsync(search, page, pageSize);
            return Ok(ApiResponse<PagedResult<UserListItemDto>>.Ok(result));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(string id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy người dùng."));
            return Ok(ApiResponse<UserDetailDto>.Ok(user));
        }

        [HttpPatch("{id}/lock")]
        public async Task<IActionResult> LockUser(string id)
        {
            try
            {
                await _userService.LockUserAsync(id);
                return Ok(ApiResponse<object?>.Ok(null, "Đã khoá tài khoản."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPatch("{id}/unlock")]
        public async Task<IActionResult> UnlockUser(string id)
        {
            try
            {
                await _userService.UnlockUserAsync(id);
                return Ok(ApiResponse<object?>.Ok(null, "Đã mở khoá tài khoản."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            try
            {
                var result = await _userService.CreateUserAsync(dto);
                return Ok(ApiResponse<UserDetailDto>.Ok(result, "Tạo tài khoản thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPatch("{id}/role")]
        public async Task<IActionResult> ChangeRole(string id, [FromBody] ChangeRoleDto dto)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (id == adminId)
                return BadRequest(ApiResponse<object>.Fail("Không thể thay đổi role của chính mình."));
            try
            {
                await _userService.ChangeRoleAsync(id, dto.Role);
                return Ok(ApiResponse<object?>.Ok(null, "Đã cập nhật quyền."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await _userService.SoftDeleteUserAsync(id, adminId);
                return Ok(ApiResponse<object?>.Ok(null, "Đã xoá tài khoản."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
