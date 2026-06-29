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
        // Public: anyone can view gallery
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(int clubId)
        {
            var result = await galleryService.GetByClubAsync(clubId);
            return Ok(ApiResponse<IEnumerable<GalleryItemResponse>>.Ok(result));
        }

        // Upload one or more images
        [HttpPost("upload")]
        [Authorize]
        public async Task<IActionResult> Upload(int clubId, [FromForm] IFormFileCollection files, [FromForm] string? description = null)
        {
            if (!await IsMemberOrAdminAsync(clubId)) return Forbid();
            if (files.Count == 0) return BadRequest(ApiResponse<object>.Fail("Chưa chọn file."));

            try
            {
                var result = await galleryService.UploadImagesAsync(clubId, files.ToList(), description);
                return Ok(ApiResponse<IEnumerable<GalleryItemResponse>>.Ok(result, $"Đã upload {result.Count()} ảnh."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Upload video file
        [HttpPost("upload-video")]
        [Authorize]
        public async Task<IActionResult> UploadVideo(int clubId, IFormFile file, [FromForm] string? description = null)
        {
            if (!await IsMemberOrAdminAsync(clubId)) return Forbid();
            if (file == null || file.Length == 0) return BadRequest(ApiResponse<object>.Fail("Chưa chọn file video."));

            try
            {
                var result = await galleryService.UploadVideoAsync(clubId, file, description);
                return Ok(ApiResponse<GalleryItemResponse>.Ok(result, "Đã upload video."));
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

        // Delete — CLUB_ADMIN only
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int clubId, int id)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();

            try
            {
                await galleryService.DeleteAsync(clubId, id);
                return Ok(ApiResponse<object>.Ok(null, "Đã xóa."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        private async Task<bool> IsMemberOrAdminAsync(int clubId)
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
