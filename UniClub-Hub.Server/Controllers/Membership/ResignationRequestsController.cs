using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.DTOs.Resignation;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Authorize]
    public class ResignationRequestsController : ControllerBase
    {
        private readonly IResignationService _resignationService;

        public ResignationRequestsController(IResignationService resignationService)
        {
            _resignationService = resignationService;
        }

        // Thành viên gửi đơn từ chức
        [HttpPost("api/clubs/{clubId}/resignation-requests")]
        public async Task<IActionResult> Submit(int clubId, [FromBody] SubmitResignationDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _resignationService.SubmitAsync(clubId, userId, dto);
                return Ok(ApiResponse<ResignationRequestDto>.Ok(result, "Đơn từ chức đã được gửi. Vui lòng chờ phê duyệt."));
            }
            catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        // Xem đơn từ chức trong CLB
        [HttpGet("api/clubs/{clubId}/resignation-requests")]
        public async Task<IActionResult> GetByClub(
            int clubId,
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] string sortBy = "requestedAt",
            [FromQuery] string sortDir = "desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");
            try
            {
                var result = await _resignationService.GetByClubAsync(clubId, userId, isSuperAdmin, new ResignationListQuery
                {
                    Search = search,
                    Status = status,
                    SortBy = sortBy,
                    SortDir = sortDir,
                    Page = page,
                    PageSize = pageSize,
                });
                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        // Duyệt đơn từ chức trong CLB
        [HttpPatch("api/clubs/{clubId}/resignation-requests/{id}")]
        public async Task<IActionResult> ReviewByClub(int clubId, int id, [FromBody] ReviewResignationDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");
            try
            {
                var result = await _resignationService.ReviewAsync(id, dto, userId, isSuperAdmin, clubId);
                return Ok(ApiResponse<ResignationRequestDto>.Ok(result, "Đã cập nhật đơn từ chức."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message)); }
            catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // SUPER_ADMIN xem tất cả đơn từ chức của CLUB_ADMIN
        [HttpGet("api/admin/resignation-requests")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> GetAllClubAdminRequests(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] string sortBy = "requestedAt",
            [FromQuery] string sortDir = "desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _resignationService.GetAllClubAdminRequestsAsync(new ResignationListQuery
            {
                Search = search,
                Status = status,
                SortBy = sortBy,
                SortDir = sortDir,
                Page = page,
                PageSize = pageSize,
            });
            return Ok(ApiResponse<object>.Ok(result));
        }

        // SUPER_ADMIN duyệt đơn từ chức của CLUB_ADMIN
        [HttpPatch("api/admin/resignation-requests/{id}")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> ReviewByAdmin(int id, [FromBody] ReviewResignationDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _resignationService.ReviewAsync(id, dto, userId, isSuperAdmin: true);
                return Ok(ApiResponse<ResignationRequestDto>.Ok(result, "Đã cập nhật đơn từ chức."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message)); }
            catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }
    }
}
