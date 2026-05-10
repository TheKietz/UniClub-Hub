using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/members")]
    public class ClubMembershipsController : ControllerBase
    {
        private readonly IClubMembershipService _membershipService;

        public ClubMembershipsController(IClubMembershipService membershipService)
        {
            _membershipService = membershipService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(int clubId, [FromQuery] string? status)
        {
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
        public async Task<IActionResult> GetById(int clubId, int membershipId)
        {
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
        public async Task<IActionResult> UpdateMember(int clubId, int membershipId, [FromBody] UpdateMemberDto dto)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                MemberDto result;
                if (isSuperAdmin)
                    result = await _membershipService.UpdateMemberAsAdminAsync(clubId, membershipId, dto);
                else
                    result = await _membershipService.UpdateMemberAsync(clubId, membershipId, dto, currentUserId);

                return Ok(ApiResponse<MemberDto>.Ok(result, "Cập nhật thành viên thành công."));
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

        [HttpDelete("{membershipId}")]
        [Authorize]
        public async Task<IActionResult> RemoveMember(int clubId, int membershipId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                if (isSuperAdmin)
                    await _membershipService.RemoveMemberAsAdminAsync(clubId, membershipId);
                else
                    await _membershipService.RemoveMemberAsync(clubId, membershipId, currentUserId);

                return Ok(ApiResponse<object>.Ok(null!, "Đã xóa thành viên khỏi CLB."));
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
    }
}
