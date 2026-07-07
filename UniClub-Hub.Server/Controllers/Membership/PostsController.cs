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
            var result = await postService.GetByClubAsync(clubId, page, pageSize, search, category, status: "Published");
            return Ok(ApiResponse<PostListResponse>.Ok(result));
        }

        // ── Admin/Editor: list all posts ────────────────────────────────────
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll(
            int clubId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null,
            [FromQuery] string? status = null)
        {
            if (!await IsEditorOrAdminAsync(clubId)) return Forbid();
            var result = await postService.GetByClubAsync(clubId, page, pageSize, search, category, status);
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

        // ── Create post (admin → can publish directly; editor → draft only) ─
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create(int clubId, [FromBody] CreatePostRequest dto)
        {
            if (!await IsEditorOrAdminAsync(clubId)) return Forbid();
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isAdmin = await IsAdminAsync(clubId);

            try
            {
                var result = await postService.CreateAsync(clubId, userId, dto, isAdmin);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Tạo bài viết thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        // ── Update post ─────────────────────────────────────────────────────
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int clubId, int id, [FromBody] UpdatePostRequest dto)
        {
            if (!await IsEditorOrAdminAsync(clubId)) return Forbid();
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isAdmin = await IsAdminAsync(clubId);

            try
            {
                var result = await postService.UpdateAsync(clubId, id, userId, dto, isAdmin);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Cập nhật bài viết thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (UnauthorizedAccessException ex) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // ── Delete post ─────────────────────────────────────────────────────
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int clubId, int id)
        {
            if (!await IsEditorOrAdminAsync(clubId)) return Forbid();
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isAdmin = await IsAdminAsync(clubId);

            try
            {
                await postService.DeleteAsync(clubId, id, userId, isAdmin);
                return Ok(ApiResponse<object>.Ok(null, "Xóa bài viết thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // ── Submit for review (editor submits own post) ─────────────────────
        [HttpPost("{id}/submit")]
        [Authorize]
        public async Task<IActionResult> Submit(int clubId, int id)
        {
            if (!await IsEditorOrAdminAsync(clubId)) return Forbid();
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            try
            {
                var result = await postService.SubmitForReviewAsync(clubId, id, userId);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Đã gửi bài viết để duyệt."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // ── Approve post (admin only) ───────────────────────────────────────
        [HttpPost("{id}/approve")]
        [Authorize]
        public async Task<IActionResult> Approve(int clubId, int id)
        {
            if (!await IsAdminAsync(clubId)) return Forbid();
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            try
            {
                var result = await postService.ApprovePostAsync(clubId, id, userId);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Đã phê duyệt và xuất bản bài viết."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // ── Reject post (admin only) ────────────────────────────────────────
        [HttpPost("{id}/reject")]
        [Authorize]
        public async Task<IActionResult> Reject(int clubId, int id, [FromBody] ReviewPostRequest dto)
        {
            if (!await IsAdminAsync(clubId)) return Forbid();
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            try
            {
                var result = await postService.RejectPostAsync(clubId, id, userId, dto.ReviewNote);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Đã từ chối bài viết."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // ── Upload thumbnail ────────────────────────────────────────────────
        [HttpPost("{id}/thumbnail")]
        [Authorize]
        public async Task<IActionResult> UploadThumbnail(int clubId, int id, IFormFile file)
        {
            if (!await IsEditorOrAdminAsync(clubId)) return Forbid();

            try
            {
                var result = await postService.UploadThumbnailAsync(clubId, id, file);
                return Ok(ApiResponse<PostResponse>.Ok(result, "Upload ảnh thành công."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // ── Helpers ─────────────────────────────────────────────────────────
        private async Task<bool> IsAdminAsync(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return false;
            return await db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId && m.UserId == userId
                && m.ClubRole == ClubRole.CLUB_ADMIN
                && m.Status == MembershipStatus.Active);
        }

        private async Task<bool> IsEditorOrAdminAsync(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return false;
            return await db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId && m.UserId == userId
                && (m.ClubRole == ClubRole.CLUB_ADMIN || m.ClubRole == ClubRole.DEPT_LEAD)
                && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation));
        }
    }
}
