using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs")]
    public class ClubsController : ControllerBase
    {
        private readonly IClubService _clubService;
        private readonly UniClubDbContext _db;
        private readonly IFileStorageService _storage;

        public ClubsController(IClubService clubService, UniClubDbContext db, IFileStorageService storage)
        {
            _clubService = clubService;
            _db = db;
            _storage = storage;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? categoryId,
            [FromQuery] string? status)
        {
            var result = await _clubService.GetAllAsync(categoryId, status);
            return Ok(ApiResponse<IEnumerable<ClubDto>>.Ok(result));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await _clubService.GetByIdAsync(id);
                return Ok(ApiResponse<ClubDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Cập nhật thông tin CLB — CLUB_ADMIN hoặc SUPER_ADMIN
        [HttpPatch("{id}/settings")]
        [Authorize]
        public async Task<IActionResult> UpdateSettings(int id, [FromBody] UpdateClubSettingsDto dto)
        {
            var club = await _db.Clubs.FindAsync(id);
            if (club == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            if (!isSuperAdmin)
            {
                var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                    m.UserId == userId && m.ClubId == id &&
                    m.ClubRole == ClubRole.ClubAdmin && m.Status == MembershipStatus.Active);
                if (!isClubAdmin) return Forbid();
            }

            if (dto.Description != null) club.Description = dto.Description;
            if (dto.ContactInfo != null) club.ContactInfo = dto.ContactInfo;
            if (dto.AdvisorName != null) club.AdvisorName = dto.AdvisorName;
            if (dto.LogoUrl != null) club.LogoUrl = dto.LogoUrl;

            await _db.SaveChangesAsync();
            var result = await _clubService.GetByIdAsync(id);
            return Ok(ApiResponse<ClubDto>.Ok(result, "Cập nhật thông tin CLB thành công."));
        }

        // Upload logo CLB — CLUB_ADMIN hoặc SUPER_ADMIN
        [HttpPost("{id}/logo")]
        [Authorize]
        public async Task<IActionResult> UploadLogo(int id, IFormFile file)
        {
            var club = await _db.Clubs.FindAsync(id);
            if (club == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            if (!isSuperAdmin)
            {
                var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                    m.UserId == userId && m.ClubId == id &&
                    m.ClubRole == ClubRole.ClubAdmin && m.Status == MembershipStatus.Active);
                if (!isClubAdmin) return Forbid();
            }

            try
            {
                var url = await _storage.UploadAsync(file, "clubs");
                club.LogoUrl = url;
                await _db.SaveChangesAsync();
                return Ok(ApiResponse<object>.Ok(new { logoUrl = url }, "Upload logo thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Lấy schema form đăng ký của CLB — public
        [HttpGet("{id}/form-schema")]
        public async Task<IActionResult> GetFormSchema(int id)
        {
            var club = await _db.Clubs.FindAsync(id);
            if (club == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

            if (string.IsNullOrEmpty(club.FormSchema))
                return Ok(ApiResponse<object?>.Ok(null, "CLB chưa cấu hình form."));

            var schema = JsonSerializer.Deserialize<JsonElement>(club.FormSchema);
            return Ok(ApiResponse<JsonElement>.Ok(schema));
        }

        // Cập nhật schema form đăng ký — CLUB_ADMIN hoặc SUPER_ADMIN
        [HttpPut("{id}/form-schema")]
        [Authorize]
        public async Task<IActionResult> UpdateFormSchema(int id, [FromBody] JsonElement schema)
        {
            var club = await _db.Clubs.FindAsync(id);
            if (club == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            if (!isSuperAdmin)
            {
                var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                    m.UserId == userId &&
                    m.ClubId == id &&
                    m.ClubRole == ClubRole.ClubAdmin &&
                    m.Status == MembershipStatus.Active);

                if (!isClubAdmin)
                    return Forbid();
            }

            club.FormSchema = JsonSerializer.Serialize(schema);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object?>.Ok(null, "Cập nhật form schema thành công."));
        }
    }
}
