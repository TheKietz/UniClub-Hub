using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.User;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _userService.GetMeAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy người dùng."));
            return Ok(ApiResponse<UserDetailDto>.Ok(user));
        }

        [HttpPatch("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await _userService.UpdateMeAsync(userId, dto);
                return Ok(ApiResponse<object?>.Ok(null, "Cập nhật thông tin thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
