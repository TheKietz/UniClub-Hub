using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs")]
    public class ClubsController : ControllerBase
    {
        private readonly IClubService _clubService;
        private readonly UniClubDbContext _db;
        private readonly IClubPermissionService _permissions;

        public ClubsController(IClubService clubService, UniClubDbContext db, IClubPermissionService permissions)
        {
            _clubService = clubService;
            _db = db;
            _permissions = permissions;
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
            var club = await _db.Clubs.FindAsync(id);
            if (club == null)
                return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

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
            if (club == null)
                return NotFound(ApiResponse<object>.Fail("Không tìm thấy CLB."));

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN");

            if (!await _permissions.HasPermissionAsync(id, userId, isSuperAdmin, ClubPermissions.RecruitmentFormManage))
                return Forbid();

            club.FormSchema = JsonSerializer.Serialize(schema);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object?>.Ok(null, "Cập nhật form schema thành công."));
        }
    }
}
