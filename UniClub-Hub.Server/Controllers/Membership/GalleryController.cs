using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Gallery;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/gallery")]
    public class GalleryController(IGalleryService galleryService, UniClubDbContext db) : ControllerBase
    {
        // Public: published only
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(int clubId)
        {
            var result = await galleryService.GetByClubAsync(clubId, publishedOnly: true);
            return Ok(ApiResponse<IEnumerable<GalleryItemResponse>>.Ok(result));
        }

        // Management: all statuses (CLUB_ADMIN or DEPT_LEAD)
        [HttpGet("manage")]
        [Authorize]
        public async Task<IActionResult> GetForManage(int clubId)
        {
            if (!await IsDeptLeadOrAdminAsync(clubId)) return Forbid();
            var result = await galleryService.GetAllForManageAsync(clubId);
            return Ok(ApiResponse<IEnumerable<GalleryItemResponse>>.Ok(result));
        }

        // Upload images — DEPT_LEAD → PendingReview, CLUB_ADMIN → Published
        [HttpPost("upload")]
        [Authorize]
        public async Task<IActionResult> Upload(int clubId, [FromForm] IFormFileCollection files, [FromForm] string? description = null)
        {
            if (!await IsDeptLeadOrAdminAsync(clubId)) return Forbid();
            if (files.Count == 0) return BadRequest(ApiResponse<object>.Fail("Chưa chọn file."));

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isAdmin = await IsClubAdminOrSuperAdminAsync(clubId);

            try
            {
                var result = await galleryService.UploadImagesAsync(clubId, userId, isAdmin, files.ToList(), description);
                var msg = isAdmin
                    ? $"Đã upload {result.Count()} ảnh."
                    : $"Đã gửi {result.Count()} ảnh để duyệt.";
                return Ok(ApiResponse<IEnumerable<GalleryItemResponse>>.Ok(result, msg));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Upload video — DEPT_LEAD → PendingReview, CLUB_ADMIN → Published
        [HttpPost("upload-video")]
        [Authorize]
        public async Task<IActionResult> UploadVideo(int clubId, IFormFile file, [FromForm] string? description = null)
        {
            if (!await IsDeptLeadOrAdminAsync(clubId)) return Forbid();
            if (file == null || file.Length == 0) return BadRequest(ApiResponse<object>.Fail("Chưa chọn file video."));

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isAdmin = await IsClubAdminOrSuperAdminAsync(clubId);

            try
            {
                var result = await galleryService.UploadVideoAsync(clubId, userId, isAdmin, file, description);
                var msg = isAdmin ? "Đã upload video." : "Đã gửi video để duyệt.";
                return Ok(ApiResponse<GalleryItemResponse>.Ok(result, msg));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // Update description — CLUB_ADMIN only
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int clubId, int id, [FromBody] UpdateGalleryItemRequest dto)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();

            try
            {
                var result = await galleryService.UpdateAsync(clubId, id, dto);
                return Ok(ApiResponse<GalleryItemResponse>.Ok(result, "Đã cập nhật."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Delete — CLUB_ADMIN can delete any; DEPT_LEAD can delete their own pending items
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int clubId, int id)
        {
            if (!await IsDeptLeadOrAdminAsync(clubId)) return Forbid();

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isAdmin = await IsClubAdminOrSuperAdminAsync(clubId);

            try
            {
                await galleryService.DeleteAsync(clubId, id, userId, isAdmin);
                return Ok(ApiResponse<object>.Ok(null, "Đã xóa."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (UnauthorizedAccessException ex) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // Approve — CLUB_ADMIN only
        [HttpPost("{id}/approve")]
        [Authorize]
        public async Task<IActionResult> Approve(int clubId, int id)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            try
            {
                var result = await galleryService.ApproveAsync(clubId, id, userId);
                return Ok(ApiResponse<GalleryItemResponse>.Ok(result, "Đã duyệt và xuất bản."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        // Reject — CLUB_ADMIN only
        [HttpPost("{id}/reject")]
        [Authorize]
        public async Task<IActionResult> Reject(int clubId, int id, [FromBody] RejectGalleryItemRequest dto)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            try
            {
                var result = await galleryService.RejectAsync(clubId, id, userId, dto.ReviewNote);
                return Ok(ApiResponse<GalleryItemResponse>.Ok(result, "Đã từ chối."));
            }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        private async Task<bool> IsDeptLeadOrAdminAsync(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return false;
            return await db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId && m.UserId == userId &&
                (m.ClubRole == ClubRole.CLUB_ADMIN || m.ClubRole == ClubRole.DEPT_LEAD) &&
                (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation));
        }

        private async Task<bool> IsClubAdminOrSuperAdminAsync(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return false;
            return await db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId && m.UserId == userId &&
                m.ClubRole == ClubRole.CLUB_ADMIN &&
                (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation));
        }
    }
}
