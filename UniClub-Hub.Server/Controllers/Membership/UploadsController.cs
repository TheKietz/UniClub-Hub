using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Shared.Common;
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
        public async Task<IActionResult> UploadClubLogo(int clubId, IFormFile file)
        {
            var club = await _db.Clubs.FindAsync(clubId);
            if (club == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

            try
            {
                await _storage.DeleteAsync(club.LogoUrl);
                club.LogoUrl = await _storage.UploadAsync(file, "clubs/logos");
                await _db.SaveChangesAsync();

                return Ok(ApiResponse<object>.Ok(new { logoUrl = club.LogoUrl }, "Upload logo thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Upload file đính kèm đơn ứng tuyển — any authenticated user
        [HttpPost("uploads/application-file")]
        public async Task<IActionResult> UploadApplicationFile(IFormFile file)
        {
            try
            {
                var url = await _storage.UploadAsync(file, "applications/files");
                return Ok(ApiResponse<object>.Ok(new { url }, "Upload thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Upload avatar cá nhân — user tự upload
        [HttpPatch("users/me/avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy người dùng."));

            try
            {
                await _storage.DeleteAsync(user.AvatarUrl);
                user.AvatarUrl = await _storage.UploadAsync(file, "users/avatars");
                await _db.SaveChangesAsync();

                return Ok(ApiResponse<object>.Ok(new { avatarUrl = user.AvatarUrl }, "Upload avatar thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
