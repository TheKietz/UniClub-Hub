using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Category;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/categories")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class AdminCategoriesController : ControllerBase
    {
        private readonly ICategoryService _categoryService;

        public AdminCategoriesController(ICategoryService categoryService)
        {
            _categoryService = categoryService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _categoryService.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<CategoryDto>>.Ok(result));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await _categoryService.GetByIdAsync(id);
                return Ok(ApiResponse<CategoryDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
        {
            try
            {
                var result = await _categoryService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id },
                    ApiResponse<CategoryDto>.Ok(result, "Tạo lĩnh vực thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryDto dto)
        {
            try
            {
                var result = await _categoryService.UpdateAsync(id, dto);
                return Ok(ApiResponse<CategoryDto>.Ok(result, "Cập nhật lĩnh vực thành công."));
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
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _categoryService.DeleteAsync(id);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa lĩnh vực thành công."));
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
