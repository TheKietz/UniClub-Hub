using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/members")]
    [Authorize]
    public class ImportController : ControllerBase
    {
        private readonly ImportService _import;
        private readonly UniClubDbContext _db;

        public ImportController(ImportService import, UniClubDbContext db)
        {
            _import = import;
            _db = db;
        }

        /// <summary>Preview import — parse file, validate, trả về kết quả mà chưa lưu</summary>
        [HttpPost("import/preview")]
        public async Task<IActionResult> Preview(int clubId, IFormFile file)
        {
            if (!await CanManage(clubId)) return Forbid();
            try
            {
                var result = await _import.PreviewAsync(clubId, file);
                return Ok(ApiResponse<ImportPreviewDto>.Ok(result));
            }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex)      { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        /// <summary>Confirm import — lưu các dòng hợp lệ vào DB</summary>
        [HttpPost("import/confirm")]
        public async Task<IActionResult> Confirm(int clubId, [FromBody] ImportConfirmRequest request)
        {
            if (!await CanManage(clubId)) return Forbid();
            var result = await _import.ConfirmAsync(clubId, request);
            return Ok(ApiResponse<ImportResultDto>.Ok(result, $"Đã thêm {result.Imported} thành viên."));
        }

        /// <summary>Tải file template Excel</summary>
        [HttpGet("import/template")]
        public IActionResult DownloadTemplate(int clubId)
        {
            var csv = "Email,ClubRole,Ban\nexample@uef.edu.vn,MEMBER,Ban Truyền thông\n";
            var bytes = System.Text.Encoding.UTF8.GetBytes(csv);
            return File(bytes, "text/csv", $"template-import-members-club{clubId}.csv");
        }

        private async Task<bool> CanManage(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return await _db.ClubMemberships.AnyAsync(m =>
                m.UserId == userId && m.ClubId == clubId &&
                m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);
        }
    }
}
