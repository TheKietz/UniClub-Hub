using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.NotificationPreference;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/membership")]
    [Authorize]
    public class NotificationPreferencesController : ControllerBase
    {
        private readonly INotificationPreferenceService _prefs;
        private readonly IClubPermissionService _permissions;

        public NotificationPreferencesController(INotificationPreferenceService prefs, IClubPermissionService permissions)
        {
            _prefs = prefs;
            _permissions = permissions;
        }

        // ── Super Admin — global defaults ────────────────────────────────────

        /// <summary>GET all global notification preferences (Super Admin only)</summary>
        [HttpGet("notification-preferences")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> GetGlobal()
        {
            var result = await _prefs.GetGlobalAsync();
            return Ok(result);
        }

        /// <summary>PUT global preference for one trigger+role (Super Admin only)</summary>
        [HttpPut("notification-preferences/{triggerKey}/{recipientRole}")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> UpsertGlobal(
            string triggerKey, string recipientRole,
            [FromBody] UpdateNotificationPreferenceDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            await _prefs.UpsertGlobalAsync(triggerKey, recipientRole, dto, userId);
            return Ok(new { success = true, message = "Đã cập nhật cài đặt thông báo." });
        }

        // ── Club Admin — per-club overrides ──────────────────────────────────

        /// <summary>GET merged notification preferences for a club (club-override → global fallback)</summary>
        [HttpGet("clubs/{clubId:int}/notification-preferences")]
        public async Task<IActionResult> GetForClub(int clubId)
        {
            try
            {
                var result = await _prefs.GetForClubAsync(clubId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>PUT club-specific override for one trigger+role</summary>
        [HttpPut("clubs/{clubId:int}/notification-preferences/{triggerKey}/{recipientRole}")]
        public async Task<IActionResult> UpsertClub(
            int clubId, string triggerKey, string recipientRole,
            [FromBody] UpdateNotificationPreferenceDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");
            if (!await _permissions.HasPermissionAsync(clubId, userId, isSuperAdmin, ClubPermissions.NotificationSettingsManage))
                return Forbid();

            try
            {
                await _prefs.UpsertClubAsync(clubId, triggerKey, recipientRole, dto);
                return Ok(new { success = true, message = "Đã cập nhật cài đặt thông báo cho CLB." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>DELETE club override → falls back to global default</summary>
        [HttpDelete("clubs/{clubId:int}/notification-preferences/{triggerKey}/{recipientRole}")]
        public async Task<IActionResult> ResetClub(int clubId, string triggerKey, string recipientRole)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");
            if (!await _permissions.HasPermissionAsync(clubId, userId, isSuperAdmin, ClubPermissions.NotificationSettingsManage))
                return Forbid();

            await _prefs.ResetClubAsync(clubId, triggerKey, recipientRole);
            return Ok(new { success = true, message = "Đã đặt lại về mặc định hệ thống." });
        }
    }
}
