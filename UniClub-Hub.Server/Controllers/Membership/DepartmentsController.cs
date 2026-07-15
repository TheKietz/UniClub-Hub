using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Department;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/departments")]
    public class DepartmentsController : ControllerBase
    {
        private readonly IDepartmentService _departmentService;

        public DepartmentsController(IDepartmentService departmentService)
        {
            _departmentService = departmentService;
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
            var (userId, isSuperAdmin) = GetRequester();
            try
            {
                var result = await _departmentService.CreateAsync(clubId, dto, userId, isSuperAdmin);
                return Ok(ApiResponse<AdminDepartmentDto>.Ok(result, "Tạo ban thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int clubId, int id, [FromBody] UpdateDepartmentDto dto)
        {
            var (userId, isSuperAdmin) = GetRequester();
            try
            {
                var result = await _departmentService.UpdateAsync(clubId, id, dto, userId, isSuperAdmin);
                return Ok(ApiResponse<AdminDepartmentDto>.Ok(result, "Cập nhật ban thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int clubId, int id)
        {
            var (userId, isSuperAdmin) = GetRequester();
            try
            {
                await _departmentService.DeleteAsync(clubId, id, userId, isSuperAdmin);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa ban thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPost("{id}/restore")]
        [Authorize]
        public async Task<IActionResult> Restore(int clubId, int id)
        {
            var (userId, isSuperAdmin) = GetRequester();
            try
            {
                var result = await _departmentService.RestoreAsync(clubId, id, userId, isSuperAdmin);
                return Ok(ApiResponse<AdminDepartmentDto>.Ok(result, "Khôi phục ban thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPatch("{id}/lead")]
        [Authorize]
        public async Task<IActionResult> SetLead(int clubId, int id, [FromBody] SetDeptLeadDto dto)
        {
            var (userId, isSuperAdmin) = GetRequester();
            try
            {
                await _departmentService.SetLeadAsync(clubId, id, dto.MembershipId, userId, isSuperAdmin);
                var result = await _departmentService.GetByIdAsync(clubId, id);
                return Ok(ApiResponse<DepartmentDto>.Ok(result, "Cập nhật trưởng ban thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        private (string UserId, bool IsSuperAdmin) GetRequester() =>
            (User.FindFirstValue(ClaimTypes.NameIdentifier)!, User.IsInRole("SUPER_ADMIN"));
    }
}
