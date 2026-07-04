using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ImportService
    {
        private const string ImportRole = "MEMBER";

        private readonly UniClubDbContext _db;
        private readonly IClubPermissionService _permissions;
        private readonly IClubMembershipService _membershipService;

        public ImportService(
            UniClubDbContext db,
            IClubPermissionService permissions,
            IClubMembershipService membershipService)
        {
            _db = db;
            _permissions = permissions;
            _membershipService = membershipService;
        }

        public async Task<ImportPreviewDto> PreviewAsync(
            int clubId,
            IFormFile file,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await EnsureCanImportExportAsync(clubId, requesterUserId, isSuperAdmin);
            EnsureFileProvided(file);

            var rows = ParseFile(file);
            var preview = new ImportPreviewDto { TotalRows = rows.Count };

            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var departmentNames = (await _db.Departments
                .Where(d => d.ClubId == clubId)
                .Select(d => d.Name.ToLower())
                .ToListAsync())
                .ToHashSet();

            var existingMemberEmails = (await _db.ClubMemberships
                .Where(m => m.ClubId == clubId &&
                    (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                .Select(m => m.User.Email!.ToLower())
                .ToListAsync())
                .ToHashSet();

            var userLookup = await _db.Users
                .Where(u => u.Email != null)
                .Select(u => new { Email = u.Email!.ToLower(), u.FullName })
                .ToDictionaryAsync(u => u.Email, u => u.FullName);

            var userEmails = userLookup.Keys.ToHashSet();
            var seenInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var error = ValidateRow(
                    row.Email,
                    row.ClubRole,
                    row.DepartmentName,
                    departmentNames,
                    existingMemberEmails,
                    seenInFile,
                    userEmails,
                    out var normalizedEmail);

                if (error != null)
                {
                    row.Error = error;
                    row.IsValid = false;
                    preview.InvalidRows.Add(row);
                    continue;
                }

                row.Email = normalizedEmail!;
                row.FullName = userLookup[normalizedEmail!];
                row.ClubRole = ImportRole;
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

            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var departments = await _db.Departments
                .Where(d => d.ClubId == clubId)
                .ToListAsync();

            var departmentNames = departments
                .Select(d => d.Name.ToLower())
                .ToHashSet();

            var userLookup = await _db.Users
                .Where(u => u.Email != null)
                .Select(u => new { u.Id, Email = u.Email!.ToLower() })
                .ToDictionaryAsync(u => u.Email, u => u.Id);

            var existingMemberEmails = (await _db.ClubMemberships
                .Where(m => m.ClubId == clubId &&
                    (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                .Select(m => m.User.Email!.ToLower())
                .ToListAsync())
                .ToHashSet();

            var pendingEmails = new HashSet<string>();
            var userEmails = userLookup.Keys.ToHashSet();
            var batchPending = 0;

            foreach (var row in request.Rows)
            {
                var error = ValidateRow(
                    row.Email,
                    row.ClubRole,
                    row.DepartmentName,
                    departmentNames,
                    existingMemberEmails,
                    pendingEmails,
                    userEmails,
                    out var normalizedEmail);

                if (error != null)
                {
                    result.Errors.Add($"{row.Email}: {error}");
                    result.Skipped++;
                    continue;
                }

                if (!userLookup.TryGetValue(normalizedEmail!, out var userId))
                {
                    result.Errors.Add($"{row.Email}: Không tìm thấy user.");
                    result.Skipped++;
                    continue;
                }

                try
                {
                    await _membershipService.EnsureMemberCapacityAsync(clubId, batchPending);
                }
                catch (InvalidOperationException ex)
                {
                    result.Errors.Add(ex.Message);
                    break;
                }

                int? deptId = null;
                if (!string.IsNullOrWhiteSpace(row.DepartmentName))
                {
                    var dept = departments.FirstOrDefault(d =>
                        d.Name.Equals(row.DepartmentName, StringComparison.OrdinalIgnoreCase));
                    deptId = dept?.Id;
                }

                _db.ClubMemberships.Add(new ClubMembership
                {
                    UserId = userId,
                    ClubId = clubId,
                    ClubRole = ClubRole.MEMBER,
                    DepartmentId = deptId,
                    JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    Status = MembershipStatus.Active,
                });

                existingMemberEmails.Add(normalizedEmail!);
                result.Imported++;
                batchPending++;
            }

            if (result.Imported > 0)
                await _db.SaveChangesAsync();

            return result;
        }

        private static string? ValidateRow(
            string? email,
            string? clubRole,
            string? departmentName,
            HashSet<string> departmentNamesLower,
            HashSet<string> existingMemberEmails,
            HashSet<string> seenInFile,
            HashSet<string> knownUserEmails,
            out string? normalizedEmail)
        {
            normalizedEmail = email?.Trim().ToLower();

            if (string.IsNullOrEmpty(normalizedEmail))
                return "Email không được để trống.";

            if (!seenInFile.Add(normalizedEmail))
                return "Email bị trùng trong file.";

            if (!knownUserEmails.Contains(normalizedEmail))
                return "Người dùng không tồn tại trong hệ thống.";

            if (existingMemberEmails.Contains(normalizedEmail))
                return "Đã là thành viên của CLB này.";

            var role = (clubRole?.Trim().ToUpper()) ?? ImportRole;
            if (role != ImportRole)
                return "Import chỉ hỗ trợ vai trò MEMBER. Bổ nhiệm vai trò đặc biệt qua flow bổ nhiệm.";

            if (!string.IsNullOrWhiteSpace(departmentName) &&
                !departmentNamesLower.Contains(departmentName.Trim().ToLower()))
                return $"Ban '{departmentName}' không tồn tại trong CLB.";

            return null;
        }

        private static void EnsureFileProvided(IFormFile? file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File import không được để trống.");
        }

        private static List<ImportRowResult> ParseFile(IFormFile file)
        {
            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext is ".xlsx" or ".xls")
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
                var role = ws.Cell(r, 2).GetString().Trim();
                var dept = ws.Cell(r, 3).GetString().Trim();
                if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(role) && string.IsNullOrWhiteSpace(dept))
                    continue;
                rows.Add(new ImportRowResult
                {
                    RowNumber = r,
                    Email = email,
                    ClubRole = string.IsNullOrEmpty(role) ? ImportRole : role,
                    DepartmentName = string.IsNullOrEmpty(dept) ? null : dept,
                });
            }
            return rows;
        }

        private static List<ImportRowResult> ParseCsv(IFormFile file)
        {
            var rows = new List<ImportRowResult>();
            using var reader = new StreamReader(file.OpenReadStream());
            reader.ReadLine();
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
                    ClubRole = parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1])
                        ? parts[1].Trim().Trim('"') : ImportRole,
                    DepartmentName = parts.Length > 2 && !string.IsNullOrWhiteSpace(parts[2])
                        ? parts[2].Trim().Trim('"') : null,
                });
                rowNum++;
            }
            return rows;
        }
    }
}
