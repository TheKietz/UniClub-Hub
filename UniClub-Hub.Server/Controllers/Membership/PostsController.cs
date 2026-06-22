using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Post;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/posts")]
    public class PostsController(IPostService postService, UniClubDbContext db) : ControllerBase
    {
        // ── Public: list published posts ────────────────────────────────────
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublic(
            int clubId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null)
        {
            var result = await postService.GetByClubAsync(clubId, page, pageSize, search, category, isPublished: true);
            return Ok(ApiResponse<PostListResponse>.Ok(result));
        }

        // ── Admin: list all posts (published + drafts) ──────────────────────
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll(
            int clubId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null,
            [FromQuery] bool? isPublished = null)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();

            var result = await postService.GetByClubAsync(clubId, page, pageSize, search, category, isPublished);
            return Ok(ApiResponse<PostListResponse>.Ok(result));
        }

        // ── Get single post ─────────────────────────────────────────────────
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int clubId, int id)
        {
            try
            {
                var result = await postService.GetByIdAsync(clubId, id);
                return Ok(ApiResponse<PostResponse>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Create post ─────────────────────────────────────────────────────
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create(int clubId, [FromBody] CreatePostRequest dto)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            try
            {
                var result = await postService.CreateAsync(clubId, userId, dto);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Tạo bài viết thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Update post ─────────────────────────────────────────────────────
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int clubId, int id, [FromBody] UpdatePostRequest dto)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();

            try
            {
                var result = await postService.UpdateAsync(clubId, id, dto);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Cập nhật bài viết thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Delete post ─────────────────────────────────────────────────────
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int clubId, int id)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();

            try
            {
                await postService.DeleteAsync(clubId, id);
                return Ok(ApiResponse<object>.Ok(null, "Xóa bài viết thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Upload thumbnail ────────────────────────────────────────────────
        [HttpPost("{id}/thumbnail")]
        [Authorize]
        public async Task<IActionResult> UploadThumbnail(int clubId, int id, IFormFile file)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();

            try
            {
                var result = await postService.UploadThumbnailAsync(clubId, id, file);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Upload ảnh thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Helper ──────────────────────────────────────────────────────────
        private async Task<bool> IsClubAdminOrSuperAdminAsync(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return false;
            return await db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId
                && m.UserId == userId
                && m.ClubRole == ClubRole.CLUB_ADMIN
                && m.Status == MembershipStatus.Active);
        }
    }
}
