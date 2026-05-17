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
        private readonly IApplicationService _applicationService;
        private readonly IResignationService _resignationService;

        public UsersController(
            IUserService userService,
            IApplicationService applicationService,
            IResignationService resignationService)
        {
            _userService = userService;
            _applicationService = applicationService;
            _resignationService = resignationService;
        }

        // Chỉ cho phép user xem data của chính mình (trừ SUPER_ADMIN)
        private bool CanAccessUser(string targetUserId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return currentUserId == targetUserId || User.IsInRole("SUPER_ADMIN");
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _userService.GetMeAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy người dùng."));
            return Ok(ApiResponse<UserDetailDto>.Ok(user));
        }

        [HttpGet("me/history")]
        public async Task<IActionResult> GetMyHistory()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var history = await _userService.GetMyHistoryAsync(userId);
            return Ok(ApiResponse<IEnumerable<MembershipHistoryDto>>.Ok(history));
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

        [HttpGet("{userId}/applications")]
        public async Task<IActionResult> GetUserApplications(string userId)
        {
            if (!CanAccessUser(userId)) return Forbid();
            var result = await _applicationService.GetMyApplicationsAsync(userId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpGet("{userId}/resignations")]
        public async Task<IActionResult> GetUserResignations(string userId)
        {
            if (!CanAccessUser(userId)) return Forbid();
            var result = await _resignationService.GetAllMyRequestsAsync(userId);
            return Ok(ApiResponse<object>.Ok(result));
        }
    }
}
