using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Resignation;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Authorize]
    public class ResignationRequestsController : ControllerBase
    {
        private readonly IResignationService _resignationService;
        private readonly UniClubDbContext _db;

        public ResignationRequestsController(IResignationService resignationService, UniClubDbContext db)
        {
            _resignationService = resignationService;
            _db = db;
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

        // CLUB_ADMIN xem đơn từ chức của DEPT_LEAD trong CLB
        [HttpGet("api/clubs/{clubId}/resignation-requests")]
        public async Task<IActionResult> GetByClub(int clubId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");
            if (!isSuperAdmin)
            {
                var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                    m.ClubId == clubId && m.UserId == userId &&
                    m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);
                if (!isClubAdmin) return Forbid();
            }
            var result = await _resignationService.GetByClubAsync(clubId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // CLUB_ADMIN duyệt đơn từ chức của DEPT_LEAD
        [HttpPatch("api/clubs/{clubId}/resignation-requests/{id}")]
        public async Task<IActionResult> ReviewByClub(int clubId, int id, [FromBody] ReviewResignationDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");
            if (!isSuperAdmin)
            {
                var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                    m.ClubId == clubId && m.UserId == userId &&
                    m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);
                if (!isClubAdmin) return Forbid();
            }
            try
            {
                var result = await _resignationService.ReviewAsync(id, dto, userId);
                return Ok(ApiResponse<ResignationRequestDto>.Ok(result, "Đã cập nhật đơn từ chức."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message)); }
            catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // SUPER_ADMIN xem tất cả đơn từ chức của CLUB_ADMIN
        [HttpGet("api/admin/resignation-requests")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> GetAllClubAdminRequests()
        {
            var result = await _resignationService.GetAllClubAdminRequestsAsync();
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
                var result = await _resignationService.ReviewAsync(id, dto, userId);
                return Ok(ApiResponse<ResignationRequestDto>.Ok(result, "Đã cập nhật đơn từ chức."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message)); }
            catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }
    }
}
