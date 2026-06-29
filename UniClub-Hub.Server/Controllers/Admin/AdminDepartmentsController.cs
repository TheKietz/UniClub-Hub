using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Department;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/clubs/{clubId}/departments")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class AdminDepartmentsController : ControllerBase
    {
        private readonly IDepartmentService _departmentService;

        public AdminDepartmentsController(IDepartmentService departmentService)
        {
            _departmentService = departmentService;
        }

        [HttpPost]
        public async Task<IActionResult> Create(int clubId, [FromBody] CreateDepartmentDto dto)
        {
            try
            {
                var result = await _departmentService.CreateAsync(clubId, dto, GetUserId(), isSuperAdmin: true);
                return CreatedAtAction(nameof(GetById), new { clubId, id = result.Id },
                    ApiResponse<AdminDepartmentDto>.Ok(result, "Tạo ban thành công."));
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

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int clubId, int id, [FromBody] UpdateDepartmentDto dto)
        {
            try
            {
                var result = await _departmentService.UpdateAsync(clubId, id, dto, GetUserId(), isSuperAdmin: true);
                return Ok(ApiResponse<AdminDepartmentDto>.Ok(result, "Cập nhật ban thành công."));
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

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int clubId, int id)
        {
            try
            {
                await _departmentService.DeleteAsync(clubId, id, GetUserId(), isSuperAdmin: true);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa ban thành công."));
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

        private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }
}
