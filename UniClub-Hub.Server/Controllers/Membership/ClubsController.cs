using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs")]
    public class ClubsController : ControllerBase
    {
        private readonly IClubService _clubService;
        private readonly IClubPermissionService _permissions;
        private readonly IFileStorageService _storage;

        public ClubsController(
            IClubService clubService,
            IClubPermissionService permissions,
            IFileStorageService storage)
        {
            _clubService = clubService;
            _permissions = permissions;
            _storage = storage;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? categoryId,
            [FromQuery] string? status
        )
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

        // Lấy schema form đăng ký của CLB — public
        [HttpGet("{id}/form-schema")]
        public async Task<IActionResult> GetFormSchema(int id)
        {
            try
            {
                var schema = await _clubService.GetFormSchemaAsync(id);
                return schema.HasValue
                    ? Ok(ApiResponse<JsonElement>.Ok(schema.Value))
                    : Ok(ApiResponse<object?>.Ok(null, "CLB chưa cấu hình form."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // Cập nhật schema form đăng ký — CLUB_ADMIN hoặc SUPER_ADMIN
        [HttpPut("{id}/form-schema")]
        [Authorize]
        public async Task<IActionResult> UpdateFormSchema(int id, [FromBody] JsonElement schema)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                await _clubService.UpdateFormSchemaAsync(id, schema, userId, isSuperAdmin);
                return Ok(ApiResponse<object?>.Ok(null, "Cập nhật form schema thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        // Cập nhật thông tin hiển thị của CLB — club-scope
        [HttpPatch("{id}/settings")]
        [Authorize]
        public async Task<IActionResult> UpdateSettings(int id, [FromBody] UpdateClubSettingsDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                var result = await _clubService.UpdateSettingsAsync(id, dto, userId, isSuperAdmin);
                return Ok(ApiResponse<ClubDto>.Ok(result, "Cập nhật cài đặt CLB thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        // Upload logo CLB — club-scope. LogoUrl được lưu ở bước PATCH /settings.
        [HttpPost("{id}/logo")]
        [Authorize]
        public async Task<IActionResult> UploadLogo(int id, IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            try
            {
                await _permissions.EnsureHasPermissionAsync(
                    id,
                    userId,
                    isSuperAdmin,
                    ClubPermissions.ClubSettingsManage);

                var logoUrl = await _storage.UploadAsync(file, "clubs/logos");
                return Ok(ApiResponse<object>.Ok(new { logoUrl }, "Upload logo thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }
    }
}
