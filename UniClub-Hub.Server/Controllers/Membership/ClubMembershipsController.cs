using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/members")]
    public class ClubMembershipsController : ControllerBase
    {
        private readonly IClubMembershipService _membershipService;
        private readonly UniClubDbContext _db;

        public ClubMembershipsController(IClubMembershipService membershipService, UniClubDbContext db)
        {
            _membershipService = membershipService;
            _db = db;
        }

        // Chỉ CLUB_ADMIN của CLB này hoặc SUPER_ADMIN mới xem được danh sách thành viên đầy đủ
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll(int clubId, [FromQuery] string? status)
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
                var result = await _membershipService.GetAllAsync(clubId, status);
                return Ok(ApiResponse<IEnumerable<MemberDto>>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("{membershipId}")]
        [Authorize]
        public async Task<IActionResult> GetById(int clubId, int membershipId)
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
                var result = await _membershipService.GetByIdAsync(clubId, membershipId);
                return Ok(ApiResponse<MemberDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> AddMember(int clubId, [FromBody] AddMemberDto dto)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                MemberDto result;
                if (isSuperAdmin)
                {
                    // SUPER_ADMIN bypass kiểm tra quyền trong CLB
                    result = await _membershipService.AddMemberAsAdminAsync(clubId, dto);
                }
                else
                {
                    result = await _membershipService.AddMemberAsync(clubId, dto, currentUserId);
                }
                return Ok(ApiResponse<MemberDto>.Ok(result, "Thêm thành viên thành công."));
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
        }

        [HttpPut("{membershipId}")]
        [Authorize]
        public async Task<IActionResult> UpdateMember(
            int clubId, int membershipId,
            [FromBody] UpdateMemberDto dto,
            [FromQuery] bool force = false)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                MemberDto result;
                if (isSuperAdmin)
                    result = await _membershipService.UpdateMemberAsAdminAsync(clubId, membershipId, dto, force);
                else
                    result = await _membershipService.UpdateMemberAsync(clubId, membershipId, dto, currentUserId);

                return Ok(ApiResponse<MemberDto>.Ok(result, "Cập nhật thành viên thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpDelete("{membershipId}")]
        [Authorize]
        public async Task<IActionResult> RemoveMember(
            int clubId, int membershipId,
            [FromQuery] bool force = false)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                if (isSuperAdmin)
                    await _membershipService.RemoveMemberAsAdminAsync(clubId, membershipId, force);
                else
                    await _membershipService.RemoveMemberAsync(clubId, membershipId, currentUserId);

                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa thành viên khỏi CLB."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpDelete("me")]
        [Authorize]
        public async Task<IActionResult> Resign(int clubId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await _membershipService.ResignAsync(clubId, currentUserId);
                return Ok(ApiResponse<object>.Ok(null!, "Bạn đã rời khỏi CLB."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPatch("{membershipId}/promote")]
        [Authorize]
        public async Task<IActionResult> PromoteMember(int clubId, int membershipId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            if (!isSuperAdmin)
            {
                var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                    m.UserId == currentUserId && m.ClubId == clubId &&
                    m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);
                if (!isClubAdmin) return Forbid();
            }

            try
            {
                var result = await _membershipService.PromoteMemberAsync(clubId, membershipId);
                return Ok(ApiResponse<MemberDto>.Ok(result, "Đã xác nhận thành viên chính thức."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message)); }
        }
    }
}
