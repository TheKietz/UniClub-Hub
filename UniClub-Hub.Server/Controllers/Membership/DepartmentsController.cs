using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Department;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/departments")]
    public class DepartmentsController : ControllerBase
    {
        private readonly IDepartmentService _departmentService;
        private readonly UniClubDbContext _db;

        public DepartmentsController(IDepartmentService departmentService, UniClubDbContext db)
        {
            _departmentService = departmentService;
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(int clubId)
        {
            try
            {
                var result = await _departmentService.GetAllAsync(clubId);
                return Ok(ApiResponse<IEnumerable<DepartmentDto>>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int clubId, int id)
        {
            try
            {
                var result = await _departmentService.GetByIdAsync(clubId, id);
                return Ok(ApiResponse<DepartmentDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create(int clubId, [FromBody] CreateDepartmentDto dto)
        {
            if (!await IsClubAdminOrSuperAdmin(clubId)) return Forbid();
            try
            {
                var result = await _departmentService.CreateAsync(clubId, dto);
                return Ok(ApiResponse<AdminDepartmentDto>.Ok(result, "Tạo ban thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int clubId, int id, [FromBody] UpdateDepartmentDto dto)
        {
            if (!await IsClubAdminOrSuperAdmin(clubId)) return Forbid();
            try
            {
                var result = await _departmentService.UpdateAsync(clubId, id, dto);
                return Ok(ApiResponse<AdminDepartmentDto>.Ok(result, "Cập nhật ban thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int clubId, int id)
        {
            if (!await IsClubAdminOrSuperAdmin(clubId)) return Forbid();
            try
            {
                await _departmentService.DeleteAsync(clubId, id);
                return Ok(ApiResponse<object>.Ok(null, "Xóa ban thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPatch("{id}/lead")]
        [Authorize]
        public async Task<IActionResult> SetLead(int clubId, int id, [FromBody] SetDeptLeadDto dto)
        {
            if (!await IsClubAdminOrSuperAdmin(clubId)) return Forbid();
            try
            {
                await _departmentService.SetLeadAsync(clubId, id, dto.MembershipId);
                var result = await _departmentService.GetByIdAsync(clubId, id);
                return Ok(ApiResponse<DepartmentDto>.Ok(result, "Cập nhật trưởng ban thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        private async Task<bool> IsClubAdminOrSuperAdmin(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return await _db.ClubMemberships.AnyAsync(m =>
                m.UserId == userId && m.ClubId == clubId &&
                m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);
        }
    }
}
