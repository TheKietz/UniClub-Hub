using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api")]
    [Authorize]
    public class UploadsController : ControllerBase
    {
        private readonly IFileStorageService _storage;
        private readonly UniClubDbContext _db;

        public UploadsController(IFileStorageService storage, UniClubDbContext db)
        {
            _storage = storage;
            _db = db;
        }

        // Upload logo CLB — SUPER_ADMIN
        [HttpPatch("admin/clubs/{clubId}/logo")]
        [Authorize(Roles = "SUPER_ADMIN")]
        [RequestSizeLimit(UploadValidation.MaxFileBytes)]
        public async Task<IActionResult> UploadClubLogo(int clubId, IFormFile file)
        {
            var club = await _db.Clubs.FindAsync(clubId);
            if (club == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

            try
            {
                UploadValidation.EnsureFile(file, UploadValidation.ImageContentTypes);
                var oldUrl = club.LogoUrl;
                club.LogoUrl = await _storage.UploadAsync(file, "clubs/logos")
                    ?? throw new InvalidOperationException("Upload thất bại.");
                await _db.SaveChangesAsync();
                await TryDeleteOldFileAsync(oldUrl);

                return Ok(ApiResponse<object>.Ok(new { logoUrl = club.LogoUrl }, "Upload logo thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Upload file đính kèm đơn ứng tuyển — any authenticated user
        [HttpPost("uploads/application-file")]
        [RequestSizeLimit(UploadValidation.MaxFileBytes)]
        public async Task<IActionResult> UploadApplicationFile(IFormFile file)
        {
            try
            {
                UploadValidation.EnsureFile(file, UploadValidation.ApplicationFileContentTypes);
                var url = await _storage.UploadAsync(file, "applications/files")
                    ?? throw new InvalidOperationException("Upload thất bại.");
                return Ok(ApiResponse<object>.Ok(new { url }, "Upload thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Upload avatar cá nhân — user tự upload
        [HttpPatch("users/me/avatar")]
        [RequestSizeLimit(UploadValidation.MaxFileBytes)]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy người dùng."));

            try
            {
                UploadValidation.EnsureFile(file, UploadValidation.ImageContentTypes);
                var oldUrl = user.AvatarUrl;
                user.AvatarUrl = await _storage.UploadAsync(file, "users/avatars")
                    ?? throw new InvalidOperationException("Upload thất bại.");
                await _db.SaveChangesAsync();
                await TryDeleteOldFileAsync(oldUrl);

                return Ok(ApiResponse<object>.Ok(new { avatarUrl = user.AvatarUrl }, "Upload avatar thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        private async Task TryDeleteOldFileAsync(string? oldUrl)
        {
            if (string.IsNullOrEmpty(oldUrl)) return;
            try
            {
                await _storage.DeleteAsync(oldUrl);
            }
            catch
            {
                // Best-effort cleanup — không chặn upload mới nếu xoá ảnh cũ thất bại.
            }
        }
    }
}
