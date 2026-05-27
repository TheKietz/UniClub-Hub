using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using System.Linq;

namespace UniClub_Hub.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/settings")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class SystemSettingsController(ISystemSettingService settingService) : ControllerBase
    {
        [HttpGet("contact")]
        [AllowAnonymous]
        public async Task<IActionResult> GetContactInfo()
        {
            var all = await settingService.GetAllAsync();
            var contact = all.Where(s => s.Category == "contact")
                             .ToDictionary(s => s.Key, s => s.Value);
            return Ok(ApiResponse<object>.Ok(contact));
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublic()
        {
            var all = await settingService.GetAllAsync();
            var pub = all.Where(s => s.Category == "landing" || s.Category == "footer")
                         .ToDictionary(s => s.Key, s => s.Value);
            return Ok(ApiResponse<object>.Ok(pub));
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var settings = await settingService.GetAllAsync();
            return Ok(ApiResponse<object>.Ok(settings));
        }

        [HttpPatch("{key}")]
        public async Task<IActionResult> Update(string key, [FromBody] UpdateSettingDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            try
            {
                await settingService.UpdateAsync(key, dto.Value, userId);
                return Ok(ApiResponse<object>.Ok(null!, "Đã cập nhật cài đặt."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPatch("{key}/enabled")]
        public async Task<IActionResult> ToggleEnabled(string key, [FromBody] ToggleSettingDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            try
            {
                await settingService.ToggleEnabledAsync(key, dto.Enabled, userId);
                return Ok(ApiResponse<object>.Ok(null!, dto.Enabled ? "Đã bật." : "Đã tắt."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }

    public record UpdateSettingDto(string Value);
    public record ToggleSettingDto(bool Enabled);
}
