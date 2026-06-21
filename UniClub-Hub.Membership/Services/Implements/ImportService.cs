using UniClub_Hub.Shared.Enums;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ImportService
    {
        private readonly UniClubDbContext _db;
        private readonly IClubPermissionService _permissions;

        private static readonly string[] ValidRoles = ["MEMBER", "DEPT_LEAD", "CLUB_ADMIN"];

        public ImportService(UniClubDbContext db, IClubPermissionService permissions)
        {
            _db = db;
            _permissions = permissions;
        }

        public async Task<ImportPreviewDto> PreviewAsync(
            int clubId,
            IFormFile file,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await EnsureCanImportExportAsync(clubId, requesterUserId, isSuperAdmin);
            var rows = ParseFile(file);
            var preview = new ImportPreviewDto { TotalRows = rows.Count };

            var club = await _db.Clubs.FindAsync(clubId);
            if (club == null) throw new KeyNotFoundException("Không tìm thấy CLB.");

            var departments = await _db.Departments
                .Where(d => d.ClubId == clubId)
                .Select(d => d.Name.ToLower())
                .ToListAsync();

            var existingEmails = await _db.ClubMemberships
                .Where(m => m.ClubId == clubId && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                .Include(m => m.User)
                .Select(m => m.User.Email!.ToLower())
                .ToListAsync();

            var usersByEmail = await _db.Users
                .Where(u => u.Email != null)
                .Select(u => new { Email = u.Email!.ToLower(), u.FullName })
                .ToListAsync();
            var userLookup = usersByEmail.ToDictionary(u => u.Email, u => u.FullName);

            foreach (var row in rows)
            {
                var email = row.Email?.Trim().ToLower() ?? "";

                if (string.IsNullOrEmpty(email))
                { row.Error = "Email không được để trống."; row.IsValid = false; preview.InvalidRows.Add(row); continue; }

                if (!userLookup.TryGetValue(email, out var fullName))
                { row.Error = "Người dùng không tồn tại trong hệ thống."; row.IsValid = false; preview.InvalidRows.Add(row); continue; }

                row.FullName = fullName;

                if (existingEmails.Contains(email))
                { row.Error = "Đã là thành viên của CLB này."; row.IsValid = false; preview.InvalidRows.Add(row); continue; }

                if (!string.IsNullOrEmpty(row.ClubRole) && !ValidRoles.Contains(row.ClubRole.ToUpper()))
                { row.Error = $"Vai trò không hợp lệ: {row.ClubRole}. Chỉ chấp nhận: MEMBER, DEPT_LEAD, CLUB_ADMIN."; row.IsValid = false; preview.InvalidRows.Add(row); continue; }

                if (!string.IsNullOrEmpty(row.DepartmentName) && !departments.Contains(row.DepartmentName.ToLower()))
                { row.Error = $"Ban '{row.DepartmentName}' không tồn tại trong CLB."; row.IsValid = false; preview.InvalidRows.Add(row); continue; }

                row.ClubRole = (row.ClubRole?.ToUpper()) ?? "MEMBER";
                row.IsValid = true;
                preview.ValidRows.Add(row);
            }

            return preview;
        }

        public async Task<ImportResultDto> ConfirmAsync(
            int clubId,
            ImportConfirmRequest request,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await EnsureCanImportExportAsync(clubId, requesterUserId, isSuperAdmin);
            var result = new ImportResultDto();

            var departments = await _db.Departments
                .Where(d => d.ClubId == clubId)
                .ToListAsync();

            var userIds = await _db.Users
                .Where(u => u.Email != null && request.Rows.Select(r => r.Email.ToLower()).Contains(u.Email.ToLower()))
                .Select(u => new { u.Id, Email = u.Email!.ToLower() })
                .ToListAsync();
            var userLookup = userIds.ToDictionary(u => u.Email, u => u.Id);

            var existingUserIds = await _db.ClubMemberships
                .Where(m => m.ClubId == clubId && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                .Select(m => m.UserId)
                .ToListAsync();

            foreach (var row in request.Rows)
            {
                var email = row.Email.ToLower();
                if (!userLookup.TryGetValue(email, out var userId))
                { result.Errors.Add($"{row.Email}: Không tìm thấy user."); result.Skipped++; continue; }

                if (existingUserIds.Contains(userId))
                { result.Skipped++; continue; }

                int? deptId = null;
                if (!string.IsNullOrEmpty(row.DepartmentName))
                {
                    var dept = departments.FirstOrDefault(d =>
                        d.Name.Equals(row.DepartmentName, StringComparison.OrdinalIgnoreCase));
                    if (dept != null) deptId = dept.Id;
                }

                _db.ClubMemberships.Add(new ClubMembership
                {
                    UserId = userId,
                    ClubId = clubId,
                    ClubRole = Enum.Parse<ClubRole>(row.ClubRole?.ToUpper() ?? "MEMBER"),
                    DepartmentId = deptId,
                    JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    Status = MembershipStatus.Active,
                });

                result.Imported++;
            }

            await _db.SaveChangesAsync();
            return result;
        }

        private static List<ImportRowResult> ParseFile(IFormFile file)
        {
            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext == ".xlsx" || ext == ".xls")
                return ParseExcel(file);
            if (ext == ".csv")
                return ParseCsv(file);
            throw new InvalidOperationException("Chỉ hỗ trợ file .xlsx hoặc .csv.");
        }

        private Task EnsureCanImportExportAsync(int clubId, string requesterUserId, bool isSuperAdmin) =>
            _permissions.EnsureHasPermissionAsync(
                clubId,
                requesterUserId,
                isSuperAdmin,
                ClubPermissions.MemberImportExport);

        private static List<ImportRowResult> ParseExcel(IFormFile file)
        {
            var rows = new List<ImportRowResult>();
            using var stream = file.OpenReadStream();
            using var wb = new XLWorkbook(stream);
            var ws = wb.Worksheet(1);
            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

            for (int r = 2; r <= lastRow; r++)
            {
                var email = ws.Cell(r, 1).GetString().Trim();
                var role  = ws.Cell(r, 2).GetString().Trim();
                var dept  = ws.Cell(r, 3).GetString().Trim();
                if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(role) && string.IsNullOrWhiteSpace(dept))
                    continue;
                rows.Add(new ImportRowResult
                {
                    RowNumber = r,
                    Email = email,
                    ClubRole = string.IsNullOrEmpty(role) ? "MEMBER" : role,
                    DepartmentName = string.IsNullOrEmpty(dept) ? null : dept,
                });
            }
            return rows;
        }

        private static List<ImportRowResult> ParseCsv(IFormFile file)
        {
            var rows = new List<ImportRowResult>();
            using var reader = new StreamReader(file.OpenReadStream());
            reader.ReadLine(); // skip header
            int rowNum = 2;
            while (!reader.EndOfStream)
            {
                var line = reader.ReadLine();
                if (string.IsNullOrWhiteSpace(line)) { rowNum++; continue; }
                var parts = line.Split(',');
                rows.Add(new ImportRowResult
                {
                    RowNumber = rowNum,
                    Email = parts.Length > 0 ? parts[0].Trim().Trim('"') : "",
                    ClubRole = parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1]) ? parts[1].Trim().Trim('"') : "MEMBER",
                    DepartmentName = parts.Length > 2 && !string.IsNullOrWhiteSpace(parts[2]) ? parts[2].Trim().Trim('"') : null,
                });
                rowNum++;
            }
            return rows;
        }
    }
}
