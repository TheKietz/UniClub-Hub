using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using System.Text;
using UniClub_Hub.Membership.DTOs.Auth;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Email;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;

        private readonly ISystemSettingService _settings;

        public AuthController(
            IAuthService authService,
            UserManager<ApplicationUser> userManager,
            IEmailService emailService,
            IConfiguration config,
            ISystemSettingService settings)
        {
            _authService = authService;
            _userManager = userManager;
            _emailService = emailService;
            _config = config;
            _settings = settings;
        }

        [HttpPost("register")]
        [EnableRateLimiting("auth:register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            try
            {
                await _authService.RegisterAsync(dto);

                var user = await _userManager.FindByEmailAsync(dto.Email);
                if (user != null)
                {
                    try
                    {
                        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
                        var appUrl = _config["AppUrl"] ?? "https://localhost:54610";
                        var confirmLink = $"{appUrl}/confirm-email?email={Uri.EscapeDataString(dto.Email)}&token={encodedToken}";
                        var logoUrl = await _settings.GetValueAsync("system.logo_url");
                        var html = EmailTemplates.EmailVerification(user.FullName ?? user.Email!, confirmLink, logoUrl);
                        await _emailService.SendAsync(dto.Email, "Xác thực tài khoản – UniClub Hub", html);
                    }
                    catch { /* Không chặn đăng ký nếu gửi mail thất bại */ }
                }

                return Ok(ApiResponse<object>.Ok(null!, "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmail([FromQuery] string email, [FromQuery] string token)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null || user.IsDeleted)
                return BadRequest(ApiResponse<object>.Fail("Liên kết xác thực không hợp lệ."));

            if (user.EmailConfirmed)
                return Ok(ApiResponse<object>.Ok(null!, "Email đã được xác thực trước đó."));

            try
            {
                var decoded = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
                var result = await _userManager.ConfirmEmailAsync(user, decoded);
                if (!result.Succeeded)
                    return BadRequest(ApiResponse<object>.Fail("Liên kết xác thực không hợp lệ hoặc đã hết hạn."));
            }
            catch
            {
                return BadRequest(ApiResponse<object>.Fail("Liên kết xác thực không hợp lệ hoặc đã hết hạn."));
            }

            return Ok(ApiResponse<object>.Ok(null!, "Xác thực email thành công. Bạn có thể đăng nhập ngay bây giờ."));
        }

        [HttpPost("resend-confirmation")]
        [EnableRateLimiting("auth:resend")]
        public async Task<IActionResult> ResendConfirmation([FromBody] ForgotPasswordDto dto)
        {
            const string safeMsg = "Nếu email tồn tại và chưa xác thực, email xác thực đã được gửi lại.";

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null || user.IsDeleted || user.EmailConfirmed)
                return Ok(ApiResponse<object>.Ok(null!, safeMsg));

            try
            {
                var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
                var appUrl = _config["AppUrl"] ?? "https://localhost:54610";
                var confirmLink = $"{appUrl}/confirm-email?email={Uri.EscapeDataString(dto.Email)}&token={encodedToken}";
                var logoUrl = await _settings.GetValueAsync("system.logo_url");
                var html = EmailTemplates.EmailVerification(user.FullName ?? user.Email!, confirmLink, logoUrl);
                await _emailService.SendAsync(dto.Email, "Xác thực tài khoản – UniClub Hub", html);
            }
            catch { }

            return Ok(ApiResponse<object>.Ok(null!, safeMsg));
        }

        [HttpPost("login")]
        [EnableRateLimiting("auth:login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            try
            {
                var result = await _authService.LoginAsync(dto);
                SetRefreshTokenCookie(result.RefreshToken, dto.RememberMe);
                return Ok(ApiResponse<AuthResponseDto>.Ok(result, "Đăng nhập thành công."));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(refreshToken))
                return Unauthorized(ApiResponse<object>.Fail("Không tìm thấy refresh token."));

            try
            {
                var result = await _authService.RefreshTokenAsync(refreshToken);
                SetRefreshTokenCookie(result.RefreshToken, rememberMe: true);
                return Ok(ApiResponse<AuthResponseDto>.Ok(result, "Làm mới token thành công."));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("revoke")]
        [Authorize]
        public async Task<IActionResult> Revoke()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (!string.IsNullOrEmpty(refreshToken))
            {
                try { await _authService.RevokeTokenAsync(refreshToken); } catch { }
            }
            ClearRefreshTokenCookie();
            return Ok(ApiResponse<object>.Ok(null!, "Đăng xuất thành công."));
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto)
        {
            try
            {
                var result = await _authService.GoogleLoginAsync(dto.AccessToken);
                SetRefreshTokenCookie(result.RefreshToken, rememberMe: true);
                return Ok(ApiResponse<AuthResponseDto>.Ok(result, "Đăng nhập Google thành công."));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse<object>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        [HttpPost("forgot-password")]
        [EnableRateLimiting("auth:forgot")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            // Luôn trả OK để tránh lộ thông tin email có tồn tại hay không
            if (user == null || user.IsDeleted)
                return Ok(ApiResponse<object>.Ok(null!, "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi."));

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
            var appUrl = _config["AppUrl"] ?? "https://localhost:54610";
            var resetLink = $"{appUrl}/reset-password?email={Uri.EscapeDataString(dto.Email)}&token={encodedToken}";

            var logoUrl = await _settings.GetValueAsync("system.logo_url");
            var html = EmailTemplates.PasswordReset(user.FullName ?? user.Email!, resetLink, logoUrl);
            await _emailService.SendAsync(dto.Email, "Đặt lại mật khẩu – UniClub Hub", html);

            return Ok(ApiResponse<object>.Ok(null!, "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi."));
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null || user.IsDeleted)
                return BadRequest(ApiResponse<object>.Fail("Yêu cầu không hợp lệ."));

            var token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(dto.Token));
            var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(ApiResponse<object>.Fail($"Đặt lại mật khẩu thất bại: {errors}"));
            }

            return Ok(ApiResponse<object>.Ok(null!, "Mật khẩu đã được đặt lại thành công."));
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private void SetRefreshTokenCookie(string token, bool rememberMe)
        {
            var options = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Path = "/api/auth",
            };

            if (rememberMe)
                options.Expires = DateTimeOffset.UtcNow.AddDays(30);
            // rememberMe = false → không set Expires → session cookie (hết khi đóng browser)

            Response.Cookies.Append("refreshToken", token, options);
        }

        private void ClearRefreshTokenCookie()
        {
            Response.Cookies.Delete("refreshToken", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Path = "/api/auth",
            });
        }
    }
}
