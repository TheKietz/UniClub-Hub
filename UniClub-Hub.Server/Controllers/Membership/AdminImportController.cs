using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/admin/import")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class AdminImportController : ControllerBase
    {
        private readonly AdminImportService _import;

        public AdminImportController(AdminImportService import)
        {
            _import = import;
        }

        [HttpGet("users/template")]
        public IActionResult DownloadTemplate()
        {
            var csv = "Email,HoTen,MaSoSinhVien,Nganh\nexample@uef.edu.vn,Nguyễn Văn A,2151000001,Công nghệ thông tin\n";
            var bytes = System.Text.Encoding.UTF8.GetBytes(csv);
            return File(bytes, "text/csv", "template-import-users.csv");
        }

        [HttpPost("users/preview")]
        public async Task<IActionResult> Preview(IFormFile file)
        {
            try
            {
                var result = await _import.PreviewUsersAsync(file);
                return Ok(ApiResponse<ImportUserPreviewDto>.Ok(result));
            }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPost("users/confirm")]
        public async Task<IActionResult> Confirm([FromBody] ImportUserConfirmRequest request)
        {
            var result = await _import.ConfirmUsersAsync(request);
            return Ok(ApiResponse<ImportResultDto>.Ok(result, $"Đã tạo {result.Imported} tài khoản."));
        }
    }
}
