using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId}/members")]
    [Authorize]
    public class ImportController : ControllerBase
    {
        private readonly ImportService _import;

        public ImportController(ImportService import)
        {
            _import = import;
        }

        /// <summary>Preview import — parse file, validate, trả về kết quả mà chưa lưu</summary>
        [HttpPost("import/preview")]
        public async Task<IActionResult> Preview(int clubId, IFormFile file)
        {
            var (userId, isSuperAdmin) = GetRequester();
            try
            {
                var result = await _import.PreviewAsync(clubId, file, userId, isSuperAdmin);
                return Ok(ApiResponse<ImportPreviewDto>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (KeyNotFoundException ex)      { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        /// <summary>Confirm import — lưu các dòng hợp lệ vào DB</summary>
        [HttpPost("import/confirm")]
        public async Task<IActionResult> Confirm(int clubId, [FromBody] ImportConfirmRequest request)
        {
            var (userId, isSuperAdmin) = GetRequester();
            try
            {
                var result = await _import.ConfirmAsync(clubId, request, userId, isSuperAdmin);
                return Ok(ApiResponse<ImportResultDto>.Ok(result, $"Đã thêm {result.Imported} thành viên."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        /// <summary>Tải file template Excel</summary>
        [HttpGet("import/template")]
        public IActionResult DownloadTemplate(int clubId)
        {
            var csv = "Email,ClubRole,Ban\nexample@uef.edu.vn,MEMBER,Ban Truyền thông\n";
            var bytes = System.Text.Encoding.UTF8.GetBytes(csv);
            return File(bytes, "text/csv", $"template-import-members-club{clubId}.csv");
        }

        private (string UserId, bool IsSuperAdmin) GetRequester() =>
            (User.FindFirstValue(ClaimTypes.NameIdentifier)!, User.IsInRole("SUPER_ADMIN"));
    }
}
