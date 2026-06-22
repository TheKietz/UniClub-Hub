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
        public async Task<IActionResult> Upload(int clubId, [FromForm] IFormFileCollection files)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();
            if (files.Count == 0) return BadRequest(ApiResponse<object>.Fail("Chưa chọn file."));

            try
            {
                var result = await galleryService.UploadImagesAsync(clubId, files.ToList());
                return Ok(ApiResponse<IEnumerable<GalleryItemResponse>>.Ok(result, $"Đã upload {result.Count()} ảnh."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Add video by URL
        [HttpPost("video")]
        [Authorize]
        public async Task<IActionResult> AddVideo(int clubId, [FromBody] AddVideoRequest dto)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId)) return Forbid();
            if (string.IsNullOrWhiteSpace(dto.Url))
                return BadRequest(ApiResponse<object>.Fail("URL video không được để trống."));

            try
            {
                var result = await galleryService.AddVideoAsync(clubId, dto);
                return Ok(ApiResponse<GalleryItemResponse>.Ok(result, "Đã thêm video."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Update description
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

        // Delete
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

        private async Task<bool> IsClubAdminOrSuperAdminAsync(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return false;
            return await db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId && m.UserId == userId &&
                m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);
        }
    }
}
