using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class AdminImportService
    {
        private readonly UniClubDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;

        private const string DefaultPassword = "UniClub@2026";

        public AdminImportService(UniClubDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        public async Task<ImportUserPreviewDto> PreviewUsersAsync(IFormFile file)
        {
            var rows = ParseFile(file);
            var preview = new ImportUserPreviewDto { TotalRows = rows.Count };

            var existingEmails = _db.Users
                .Where(u => u.Email != null)
                .Select(u => u.Email!.ToLower())
                .ToHashSet();

            var seenInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var email = row.Email?.Trim().ToLower() ?? "";

                if (string.IsNullOrEmpty(email))
                { row.Error = "Email không được để trống."; row.IsValid = false; preview.InvalidRows.Add(row); continue; }

                if (!email.Contains('@'))
                { row.Error = "Email không đúng định dạng."; row.IsValid = false; preview.InvalidRows.Add(row); continue; }

                if (existingEmails.Contains(email))
                { row.Error = "Email đã tồn tại trong hệ thống."; row.IsValid = false; preview.InvalidRows.Add(row); continue; }

                if (!seenInFile.Add(email))
                { row.Error = "Email bị trùng trong file."; row.IsValid = false; preview.InvalidRows.Add(row); continue; }

                row.IsValid = true;
                preview.ValidRows.Add(row);
            }

            return await Task.FromResult(preview);
        }

        public async Task<ImportResultDto> ConfirmUsersAsync(ImportUserConfirmRequest request)
        {
            var result = new ImportResultDto();

            foreach (var row in request.Rows)
            {
                var existing = await _userManager.FindByEmailAsync(row.Email);
                if (existing != null) { result.Skipped++; continue; }

                var user = new ApplicationUser
                {
                    UserName  = row.Email,
                    Email     = row.Email,
                    FullName  = row.FullName,
                    StudentId = row.StudentId,
                    Major     = row.Major,
                    EmailConfirmed = true,
                };

                var createResult = await _userManager.CreateAsync(user, DefaultPassword);
                if (createResult.Succeeded)
                {
                    await _userManager.AddToRoleAsync(user, "USER");
                    result.Imported++;
                }
                else
                {
                    result.Errors.Add($"{row.Email}: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
                    result.Skipped++;
                }
            }

            return result;
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private static List<ImportUserRowResult> ParseFile(IFormFile file)
        {
            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext is ".xlsx" or ".xls") return ParseExcel(file);
            if (ext == ".csv")            return ParseCsv(file);
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
                var email     = ws.Cell(r, 1).GetString().Trim();
                var fullName  = ws.Cell(r, 2).GetString().Trim();
                var studentId = ws.Cell(r, 3).GetString().Trim();
                var major     = ws.Cell(r, 4).GetString().Trim();
                if (string.IsNullOrWhiteSpace(email)) continue;
                rows.Add(new ImportUserRowResult
                {
                    RowNumber = r,
                    Email     = email,
                    FullName  = string.IsNullOrEmpty(fullName)  ? null : fullName,
                    StudentId = string.IsNullOrEmpty(studentId) ? null : studentId,
                    Major     = string.IsNullOrEmpty(major)     ? null : major,
                });
            }
            return rows;
        }

        private static List<ImportUserRowResult> ParseCsv(IFormFile file)
        {
            var rows = new List<ImportUserRowResult>();
            using var reader = new StreamReader(file.OpenReadStream());
            reader.ReadLine(); // skip header
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
                    Email     = email,
                    FullName  = string.IsNullOrEmpty(Get(1)) ? null : Get(1),
                    StudentId = string.IsNullOrEmpty(Get(2)) ? null : Get(2),
                    Major     = string.IsNullOrEmpty(Get(3)) ? null : Get(3),
                });
                rowNum++;
            }
            return rows;
        }
    }
}
