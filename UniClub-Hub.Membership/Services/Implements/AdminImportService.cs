using System.Security.Cryptography;
using System.Text;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Email;
using UniClub_Hub.Shared.Models;
using Microsoft.Extensions.Configuration;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class AdminImportService
    {
        private readonly UniClubDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;
        private readonly ISystemSettingService _settings;

        public AdminImportService(
            UniClubDbContext db,
            UserManager<ApplicationUser> userManager,
            IEmailService emailService,
            IConfiguration config,
            ISystemSettingService settings)
        {
            _db = db;
            _userManager = userManager;
            _emailService = emailService;
            _config = config;
            _settings = settings;
        }

        public async Task<ImportUserPreviewDto> PreviewUsersAsync(IFormFile file)
        {
            EnsureFileProvided(file);
            var rows = ParseFile(file);
            var preview = new ImportUserPreviewDto { TotalRows = rows.Count };

            var existingEmails = (await _db.Users
                .Where(u => u.Email != null)
                .Select(u => u.Email!.ToLower())
                .ToListAsync())
                .ToHashSet();

            var existingStudentIds = (await _db.Users
                .Where(u => u.StudentId != null)
                .Select(u => u.StudentId!.ToLower())
                .ToListAsync())
                .ToHashSet();

            var seenEmails = new HashSet<string>();
            var seenStudentIds = new HashSet<string>();

            foreach (var row in rows)
            {
                var email = row.Email?.Trim().ToLower() ?? "";

                if (string.IsNullOrEmpty(email))
                {
                    row.Error = "Email không được để trống.";
                    row.IsValid = false;
                    preview.InvalidRows.Add(row);
                    continue;
                }

                if (!email.Contains('@'))
                {
                    row.Error = "Email không đúng định dạng.";
                    row.IsValid = false;
                    preview.InvalidRows.Add(row);
                    continue;
                }

                if (existingEmails.Contains(email))
                {
                    row.Error = "Email đã tồn tại trong hệ thống.";
                    row.IsValid = false;
                    preview.InvalidRows.Add(row);
                    continue;
                }

                if (!seenEmails.Add(email))
                {
                    row.Error = "Email bị trùng trong file.";
                    row.IsValid = false;
                    preview.InvalidRows.Add(row);
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(row.StudentId))
                {
                    var studentId = row.StudentId.Trim().ToLower();
                    if (!seenStudentIds.Add(studentId))
                    {
                        row.Error = "MSSV bị trùng trong file.";
                        row.IsValid = false;
                        preview.InvalidRows.Add(row);
                        continue;
                    }

                    if (existingStudentIds.Contains(studentId))
                    {
                        row.Error = "MSSV đã tồn tại trong hệ thống.";
                        row.IsValid = false;
                        preview.InvalidRows.Add(row);
                        continue;
                    }
                }

                row.IsValid = true;
                preview.ValidRows.Add(row);
            }

            return preview;
        }

        public async Task<ImportResultDto> ConfirmUsersAsync(ImportUserConfirmRequest request)
        {
            var result = new ImportResultDto();
            var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var seenStudentIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var row in request.Rows)
            {
                var email = row.Email?.Trim().ToLower() ?? "";
                if (string.IsNullOrEmpty(email))
                {
                    result.Errors.Add("Dòng thiếu email.");
                    result.Skipped++;
                    continue;
                }

                if (!seenEmails.Add(email))
                {
                    result.Errors.Add($"{row.Email}: Email bị trùng trong request.");
                    result.Skipped++;
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(row.StudentId))
                {
                    var studentId = row.StudentId.Trim();
                    if (!seenStudentIds.Add(studentId))
                    {
                        result.Errors.Add($"{row.Email}: MSSV bị trùng trong request.");
                        result.Skipped++;
                        continue;
                    }
                }

                try
                {
                    var existing = await _userManager.FindByEmailAsync(email);
                    if (existing != null)
                    {
                        result.Skipped++;
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(row.StudentId))
                    {
                        var studentIdTaken = await _db.Users.AnyAsync(u =>
                            u.StudentId != null &&
                            u.StudentId.ToLower() == row.StudentId.Trim().ToLower());
                        if (studentIdTaken)
                        {
                            result.Errors.Add($"{row.Email}: MSSV đã tồn tại trong hệ thống.");
                            result.Skipped++;
                            continue;
                        }
                    }

                    var user = new ApplicationUser
                    {
                        UserName = row.Email,
                        Email = row.Email,
                        FullName = row.FullName,
                        StudentId = row.StudentId,
                        Major = row.Major,
                        EmailConfirmed = false,
                    };

                    var createResult = await _userManager.CreateAsync(user, GenerateSecurePassword());
                    if (!createResult.Succeeded)
                    {
                        result.Errors.Add($"{row.Email}: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
                        result.Skipped++;
                        continue;
                    }

                    await _userManager.AddToRoleAsync(user, "USER");
                    await TrySendPasswordResetEmailAsync(user);
                    result.Imported++;
                }
                catch (DbUpdateException)
                {
                    result.Errors.Add($"{row.Email}: Không thể lưu — dữ liệu trùng hoặc không hợp lệ.");
                    result.Skipped++;
                }
            }

            return result;
        }

        private async Task TrySendPasswordResetEmailAsync(ApplicationUser user)
        {
            if (string.IsNullOrEmpty(user.Email))
                return;

            try
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
                var appUrl = _config["AppUrl"] ?? "https://localhost:54610";
                var resetLink =
                    $"{appUrl}/reset-password?email={Uri.EscapeDataString(user.Email)}&token={encodedToken}";
                var logoUrl = await _settings.GetValueAsync("system.logo_url");
                var html = EmailTemplates.PasswordReset(
                    user.FullName ?? user.Email,
                    resetLink,
                    logoUrl);
                await _emailService.SendAsync(user.Email, "Đặt mật khẩu tài khoản – UniClub Hub", html);
            }
            catch
            {
                // Không chặn import nếu email thất bại — admin có thể gửi lại reset sau.
            }
        }

        private static string GenerateSecurePassword()
        {
            var bytes = RandomNumberGenerator.GetBytes(24);
            return $"{Convert.ToBase64String(bytes)}Aa1!";
        }

        private static void EnsureFileProvided(IFormFile? file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File import không được để trống.");
        }

        private static List<ImportUserRowResult> ParseFile(IFormFile file)
        {
            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext is ".xlsx" or ".xls") return ParseExcel(file);
            if (ext == ".csv") return ParseCsv(file);
            throw new InvalidOperationException("Chỉ hỗ trợ file .xlsx hoặc .csv.");
        }

        private static List<ImportUserRowResult> ParseExcel(IFormFile file)
        {
            var rows = new List<ImportUserRowResult>();
            using var stream = file.OpenReadStream();
            using var wb = new XLWorkbook(stream);
            var ws = wb.Worksheet(1);
            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

            for (int r = 2; r <= lastRow; r++)
            {
                var email = ws.Cell(r, 1).GetString().Trim();
                var fullName = ws.Cell(r, 2).GetString().Trim();
                var studentId = ws.Cell(r, 3).GetString().Trim();
                var major = ws.Cell(r, 4).GetString().Trim();
                if (string.IsNullOrWhiteSpace(email)) continue;
                rows.Add(new ImportUserRowResult
                {
                    RowNumber = r,
                    Email = email,
                    FullName = string.IsNullOrEmpty(fullName) ? null : fullName,
                    StudentId = string.IsNullOrEmpty(studentId) ? null : studentId,
                    Major = string.IsNullOrEmpty(major) ? null : major,
                });
            }
            return rows;
        }

        private static List<ImportUserRowResult> ParseCsv(IFormFile file)
        {
            var rows = new List<ImportUserRowResult>();
            using var reader = new StreamReader(file.OpenReadStream());
            reader.ReadLine();
            int rowNum = 2;
            while (!reader.EndOfStream)
            {
                var line = reader.ReadLine();
                if (string.IsNullOrWhiteSpace(line)) { rowNum++; continue; }
                var parts = line.Split(',');
                string Get(int i) => parts.Length > i ? parts[i].Trim().Trim('"') : "";
                var email = Get(0);
                if (string.IsNullOrEmpty(email)) { rowNum++; continue; }
                rows.Add(new ImportUserRowResult
                {
                    RowNumber = rowNum,
                    Email = email,
                    FullName = string.IsNullOrEmpty(Get(1)) ? null : Get(1),
                    StudentId = string.IsNullOrEmpty(Get(2)) ? null : Get(2),
                    Major = string.IsNullOrEmpty(Get(3)) ? null : Get(3),
                });
                rowNum++;
            }
            return rows;
        }
    }
}
