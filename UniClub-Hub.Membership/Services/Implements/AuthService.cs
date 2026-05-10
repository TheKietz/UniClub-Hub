using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using UniClub_Hub.Membership.DTOs.Auth;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly UniClubDbContext _db;
        private readonly IConfiguration _config;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            UniClubDbContext db,
            IConfiguration config)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _db = db;
            _config = config;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
        {
            var existing = await _userManager.FindByEmailAsync(dto.Email);
            if (existing != null)
                throw new InvalidOperationException("Email đã được sử dụng.");

            if (!string.IsNullOrEmpty(dto.StudentId))
            {
                var studentIdTaken = await _db.Users.AnyAsync(u => u.StudentId == dto.StudentId);
                if (studentIdTaken)
                    throw new InvalidOperationException("Mã sinh viên đã được sử dụng.");
            }

            var user = new ApplicationUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                FullName = dto.FullName,
                StudentId = dto.StudentId,
                Major = dto.Major,
                Phone = dto.Phone
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException(errors);
            }

            if (!await _roleManager.RoleExistsAsync("USER"))
                await _roleManager.CreateAsync(new IdentityRole("USER"));

            await _userManager.AddToRoleAsync(user, "USER");

            return await BuildAuthResponseAsync(user);
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email)
                ?? throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

            if (!await _userManager.CheckPasswordAsync(user, dto.Password))
                throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

            return await BuildAuthResponseAsync(user);
        }

        public async Task<AuthResponseDto> GoogleLoginAsync(string accessToken)
        {
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await http.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");
            if (!response.IsSuccessStatusCode)
                throw new UnauthorizedAccessException("Google token không hợp lệ.");

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = doc.RootElement;

            var email = root.TryGetProperty("email", out var emailProp)
                ? emailProp.GetString() : null;
            if (string.IsNullOrEmpty(email))
                throw new UnauthorizedAccessException("Không lấy được email từ Google.");

            var name = root.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : null;
            var picture = root.TryGetProperty("picture", out var picProp) ? picProp.GetString() : null;

            var user = await _userManager.FindByEmailAsync(email);

            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = name,
                    EmailConfirmed = true,
                    AvatarUrl = picture
                };

                var result = await _userManager.CreateAsync(user);
                if (!result.Succeeded)
                {
                    var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                    throw new InvalidOperationException(errors);
                }

                if (!await _roleManager.RoleExistsAsync("USER"))
                    await _roleManager.CreateAsync(new IdentityRole("USER"));

                await _userManager.AddToRoleAsync(user, "USER");
            }
            else if (user.IsDeleted)
            {
                throw new UnauthorizedAccessException("Tài khoản đã bị vô hiệu hóa.");
            }

            return await BuildAuthResponseAsync(user);
        }

        public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
        {
            var stored = await _db.RefreshTokens
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Token == refreshToken)
                ?? throw new UnauthorizedAccessException("Refresh token không hợp lệ.");

            if (!stored.IsActive)
                throw new UnauthorizedAccessException("Refresh token đã hết hạn hoặc bị thu hồi.");

            // Thu hồi token cũ, cấp cặp token mới (rotation)
            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return await BuildAuthResponseAsync(stored.User);
        }

        public async Task RevokeTokenAsync(string refreshToken)
        {
            var stored = await _db.RefreshTokens
                .FirstOrDefaultAsync(r => r.Token == refreshToken)
                ?? throw new UnauthorizedAccessException("Refresh token không hợp lệ.");

            if (!stored.IsActive)
                throw new InvalidOperationException("Refresh token đã bị thu hồi.");

            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // ── Helpers ──────────────────────────────────────────────────────

        private async Task<AuthResponseDto> BuildAuthResponseAsync(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var systemRole = roles.FirstOrDefault() ?? "USER";
            var (accessToken, expiresAt) = GenerateAccessToken(user, systemRole);
            var newRefreshToken = await CreateRefreshTokenAsync(user.Id);

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = newRefreshToken,
                Email = user.Email!,
                FullName = user.FullName ?? user.Email!,
                SystemRole = systemRole,
                AccessTokenExpiresAt = expiresAt
            };
        }

        private (string token, DateTime expiresAt) GenerateAccessToken(ApplicationUser user, string role)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var expiryMinutes = int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "60");
            var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email!),
                new Claim(ClaimTypes.Role, role),
                new Claim("fullName", user.FullName ?? ""),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: expiresAt,
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
            );

            return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
        }

        private async Task<string> CreateRefreshTokenAsync(string userId)
        {
            var expiryDays = int.Parse(_config["Jwt:RefreshTokenExpiryDays"] ?? "7");
            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

            _db.RefreshTokens.Add(new RefreshToken
            {
                Token = token,
                UserId = userId,
                ExpiresAt = DateTime.UtcNow.AddDays(expiryDays)
            });
            await _db.SaveChangesAsync();

            return token;
        }
    }
}
