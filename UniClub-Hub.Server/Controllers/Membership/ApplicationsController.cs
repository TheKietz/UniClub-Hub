using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Application;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/applications")]
    public class ApplicationsController : ControllerBase
    {
        private readonly IApplicationService _applicationService;

        public ApplicationsController(IApplicationService applicationService)
        {
            _applicationService = applicationService;
        }

        // User xem đơn của mình trong CLB này
        [HttpGet("mine")]
        [Authorize]
        public async Task<IActionResult> GetMine(int clubId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var all = await _applicationService.GetMyApplicationsAsync(userId);
            var result = all.Where(a => a.ClubId == clubId);
            return Ok(ApiResponse<IEnumerable<ApplicationDto>>.Ok(result));
        }

        // Admin xem tất cả đơn của CLB
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll(int clubId, [FromQuery] string? status)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                var result = await _applicationService.GetAllByClubAsync(clubId, status);
                return Ok(ApiResponse<IEnumerable<AdminApplicationDto>>.Ok(result));
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // User nộp đơn
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Submit(int clubId, [FromBody] SubmitApplicationDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            try
            {
                var result = await _applicationService.SubmitAsync(clubId, userId, dto);
                return Ok(ApiResponse<ApplicationDto>.Ok(result, "Nộp đơn thành công. Vui lòng chờ CLB xét duyệt."));
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

        // CLUB_ADMIN hoặc SUPER_ADMIN duyệt đơn
        [HttpPut("{applicationId}/review")]
        [Authorize]
        public async Task<IActionResult> Review(int clubId, int applicationId, [FromBody] ReviewApplicationDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                var result = await _applicationService.ReviewAsync(clubId, applicationId, dto, userId, isSuperAdmin);
                return Ok(ApiResponse<AdminApplicationDto>.Ok(result, $"Đã cập nhật trạng thái đơn thành '{dto.Status}'."));
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ApiResponse<object>.Fail(ex.Message));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
