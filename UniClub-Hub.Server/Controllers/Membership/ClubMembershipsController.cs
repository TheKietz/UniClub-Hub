using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/members")]
    public class ClubMembershipsController : ControllerBase
    {
        private readonly IClubMembershipService _membershipService;
        private readonly IRoleSuggestionService _roleSuggestionService;
        private readonly IClubPermissionService _permissions;
        private readonly UniClubDbContext _db;

        public ClubMembershipsController(
            IClubMembershipService membershipService,
            IRoleSuggestionService roleSuggestionService,
            IClubPermissionService permissions,
            UniClubDbContext db
        )
        {
            _membershipService = membershipService;
            _roleSuggestionService = roleSuggestionService;
            _permissions = permissions;
            _db = db;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll(
            int clubId,
            [FromQuery] string? status,
            [FromQuery] int? departmentId,
            [FromQuery] string? search,
            [FromQuery] string? role,
            [FromQuery] string sortBy = "name",
            [FromQuery] string sortDir = "asc",
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            if (!await _permissions.HasPermissionAsync(clubId, userId, isSuperAdmin, ClubPermissions.MembersView))
                return Forbid();

            try
            {
                if (page.HasValue || pageSize.HasValue)
                {
                    var paged = await _membershipService.GetPageAsync(clubId, new MemberListQuery
                    {
                        Search = search,
                        Role = role,
                        Status = status,
                        DepartmentId = departmentId,
                        SortBy = sortBy,
                        SortDir = sortDir,
                        Page = page ?? 1,
                        PageSize = pageSize ?? 20
                    });
                    return Ok(ApiResponse<PagedResult<MemberDto>>.Ok(paged));
                }

                var result = await _membershipService.GetAllAsync(clubId, status, departmentId);
                return Ok(ApiResponse<IEnumerable<MemberDto>>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("suggest")]
        [Authorize]
        public async Task<IActionResult> SuggestMembers(int clubId, [FromQuery] string q = "")
        {
            var lowerQ = q.ToLower();
            var results = await _db.ClubMemberships
                .Where(m => m.ClubId == clubId && m.Status == MembershipStatus.Active)
                .Where(m => string.IsNullOrEmpty(q) ||
                            (m.User.FullName ?? "").ToLower().Contains(lowerQ) ||
                            m.User.Email.ToLower().Contains(lowerQ))
                .OrderBy(m => m.User.FullName)
                .Take(8)
                .Select(m => new { UserId = m.UserId, Name = m.User.FullName ?? m.User.Email, AvatarUrl = m.User.AvatarUrl })
                .ToListAsync();
            return Ok(ApiResponse<object>.Ok(results));
        }

        [HttpGet("{membershipId}")]
        [Authorize]
        public async Task<IActionResult> GetById(int clubId, int membershipId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");
            if (!await _permissions.HasPermissionAsync(clubId, userId, isSuperAdmin, ClubPermissions.MembersView))
                return Forbid();

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

        [HttpPost("{membershipId}/role-suggestions")]
        [Authorize]
        public async Task<IActionResult> SuggestRoleForMember(int clubId, int membershipId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                var result = await _roleSuggestionService.SuggestRoleForMemberAsync(
                    clubId,
                    membershipId,
                    currentUserId,
                    isSuperAdmin,
                    HttpContext.RequestAborted
                );
                return Ok(ApiResponse<object>.Ok(result, "Đã tạo gợi ý vai trò."));
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

        // ── Custom member fields ──────────────────────────────────────────

        [HttpGet("field-schema")]
        [Authorize]
        public async Task<IActionResult> GetMemberFieldSchema(int clubId)
        {
            var result = await _membershipService.GetMemberFieldSchemaAsync(clubId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPut("field-schema")]
        [Authorize]
        public async Task<IActionResult> UpdateMemberFieldSchema(
            int clubId, [FromBody] List<UniClub_Hub.Membership.DTOs.Membership.MemberFieldDef> fields)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _membershipService.UpdateMemberFieldSchemaAsync(clubId, fields, userId);
                return Ok(ApiResponse<object>.Ok(result, "Đã lưu cấu hình trường thông tin."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPatch("{membershipId}/custom-data")]
        [Authorize]
        public async Task<IActionResult> UpdateMemberCustomData(
            int clubId, int membershipId, [FromBody] Dictionary<string, string?> data)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _membershipService.UpdateMemberCustomDataAsync(clubId, membershipId, data, userId);
                return Ok(ApiResponse<MemberDto>.Ok(result, "Đã cập nhật thông tin thành viên."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPatch("{membershipId}/promote")]
        [Authorize]
        public async Task<IActionResult> PromoteMember(int clubId, int membershipId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            if (!await _permissions.HasPermissionAsync(clubId, currentUserId, isSuperAdmin, ClubPermissions.MembersManage))
                return Forbid();

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
