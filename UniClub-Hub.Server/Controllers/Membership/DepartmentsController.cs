using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Department;
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
    }
}
