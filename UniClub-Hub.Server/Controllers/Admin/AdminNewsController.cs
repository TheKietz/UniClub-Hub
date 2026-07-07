using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Post;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Admin
{
    /// <summary>
    /// Quản lý tin tức cấp trường (school-level news) — Post.ClubId == null.
    /// Chỉ SUPER_ADMIN. Không qua workflow duyệt như tin của CLB.
    /// </summary>
    [ApiController]
    [Route("api/admin/news")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class AdminNewsController(IPostService postService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null,
            [FromQuery] string? status = null)
        {
            var result = await postService.GetByClubAsync(null, page, pageSize, search, category, status);
            return Ok(ApiResponse<PostListResponse>.Ok(result));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await postService.GetByIdAsync(null, id);
                return Ok(ApiResponse<PostResponse>.Ok(result));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePostRequest dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await postService.CreateAsync(null, userId, dto, isAdmin: true);
            return Ok(ApiResponse<PostResponse>.Ok(result, "Tạo tin cấp trường thành công."));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePostRequest dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await postService.UpdateAsync(null, id, userId, dto, isAdmin: true);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Cập nhật tin thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await postService.DeleteAsync(null, id, userId, isAdmin: true);
                return Ok(ApiResponse<object>.Ok(null!, "Xóa tin thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPatch("{id:int}/publish")]
        public async Task<IActionResult> SetPublish(int id, [FromBody] SetPublishRequest dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await postService.SetPublishStateAsync(null, id, dto.Published, userId);
                return Ok(ApiResponse<PostResponse>.Ok(result, dto.Published ? "Đã xuất bản tin." : "Đã chuyển về bản nháp."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPost("{id:int}/thumbnail")]
        public async Task<IActionResult> UploadThumbnail(int id, IFormFile file)
        {
            try
            {
                var result = await postService.UploadThumbnailAsync(null, id, file);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Upload ảnh thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }
    }

    public class SetPublishRequest
    {
        public bool Published { get; set; }
    }
}
