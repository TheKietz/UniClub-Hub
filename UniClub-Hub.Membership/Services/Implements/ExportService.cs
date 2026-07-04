using UniClub_Hub.Shared.Common;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using System.Text;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ExportService : IExportService
    {
        private readonly UniClubDbContext _db;
        private readonly IClubPermissionService _permissions;

        public ExportService(UniClubDbContext db, IClubPermissionService permissions)
        {
            _db = db;
            _permissions = permissions;
        }

        public async Task<(byte[] Content, string ContentType, string FileName)> ExportMembersAsync(
            int clubId,
            string format,
            string requesterUserId,
            bool isSuperAdmin,
            MemberListQuery? request = null)
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId,
                requesterUserId,
                isSuperAdmin,
                ClubPermissions.MemberImportExport);

            var club = await _db.Clubs.FindAsync(clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy CLB.");

            var query = _db.ClubMemberships
                .AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.Department)
                .Where(m => m.ClubId == clubId)
                .AsQueryable();

            query = ApplyMemberFilters(query, request);
            query = ApplyMemberSort(query, request?.SortBy, request?.SortDir);

            var members = await query
                .Select(m => new
                {
                    FullName   = m.User.FullName ?? m.User.Email ?? "",
                    Email      = m.User.Email ?? "",
                    StudentId  = m.User.StudentId ?? "",
                    Major      = m.User.Major ?? "",
                    ClubRole   = m.ClubRole,
                    Department = m.Department != null ? m.Department.Name : "",
                    JoinedDate = m.JoinedDate.ToString("dd/MM/yyyy"),
                    Status     = m.Status
                })
                .ToListAsync();

            string[] headers = ["STT", "Họ tên", "Email", "MSSV", "Chuyên ngành", "Vai trò", "Ban", "Ngày tham gia", "Trạng thái"];

            if (format == "csv")
            {
                var csv = BuildCsv(headers, members.Select((m, i) => new object?[]
                    { i + 1, m.FullName, m.Email, m.StudentId, m.Major, m.ClubRole, m.Department, m.JoinedDate, m.Status }));
                return (ToCsvBytes(csv), "text/csv", $"members_{club.Code}.csv");
            }

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Danh sách thành viên");

            WriteExcelHeaders(ws, headers);
            for (int i = 0; i < members.Count; i++)
            {
                var m = members[i];
                ws.Cell(i + 2, 1).Value = i + 1;
                ws.Cell(i + 2, 2).Value = m.FullName;
                ws.Cell(i + 2, 3).Value = m.Email;
                ws.Cell(i + 2, 4).Value = m.StudentId;
                ws.Cell(i + 2, 5).Value = m.Major;
                ws.Cell(i + 2, 6).Value = m.ClubRole.ToString();
                ws.Cell(i + 2, 7).Value = m.Department;
                ws.Cell(i + 2, 8).Value = m.JoinedDate;
                ws.Cell(i + 2, 9).Value = m.Status.ToString();
            }
            ws.Columns().AdjustToContents();

            return (ToBytes(wb), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"members_{club.Code}.xlsx");
        }

        public async Task<(byte[] Content, string ContentType, string FileName)> ExportApplicationsAsync(
            int clubId,
            string? status,
            string format,
            string requesterUserId,
            bool isSuperAdmin,
            ApplicationListQuery? request = null)
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId,
                requesterUserId,
                isSuperAdmin,
                ClubPermissions.ReportsExport);

            var club = await _db.Clubs.FindAsync(clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy CLB.");

            request ??= new ApplicationListQuery();
            if (!string.IsNullOrWhiteSpace(status))
                request.Status = status;

            var query = _db.Applications
                .AsNoTracking()
                .Include(a => a.User)
                .Include(a => a.CurrentStage)
                .Where(a => a.ClubId == clubId)
                .AsQueryable();

            query = ApplyApplicationFilters(query, request);
            query = ApplyApplicationSort(query, request.SortBy, request.SortDir);

            var applications = await query
                .Select(a => new
                {
                    FullName  = a.User.FullName ?? a.User.Email ?? "",
                    Email     = a.User.Email ?? "",
                    StudentId = a.User.StudentId ?? "",
                    AppliedAt = a.AppliedAt.ToString("dd/MM/yyyy HH:mm"),
                    Stage     = a.CurrentStage != null ? a.CurrentStage.Name : "",
                    Status    = a.Status
                })
                .ToListAsync();

            string[] headers = ["STT", "Họ tên", "Email", "MSSV", "Ngày nộp đơn", "Vòng", "Trạng thái"];
            var suffix = string.IsNullOrEmpty(request.Status) ? "" : $"_{request.Status.ToLower()}";

            if (format == "csv")
            {
                var csv = BuildCsv(headers, applications.Select((a, i) => new object?[]
                    { i + 1, a.FullName, a.Email, a.StudentId, a.AppliedAt, a.Stage, a.Status }));
                return (ToCsvBytes(csv), "text/csv", $"applications_{club.Code}{suffix}.csv");
            }

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Danh sách đơn");

            WriteExcelHeaders(ws, headers);
            for (int i = 0; i < applications.Count; i++)
            {
                var a = applications[i];
                ws.Cell(i + 2, 1).Value = i + 1;
                ws.Cell(i + 2, 2).Value = a.FullName;
                ws.Cell(i + 2, 3).Value = a.Email;
                ws.Cell(i + 2, 4).Value = a.StudentId;
                ws.Cell(i + 2, 5).Value = a.AppliedAt;
                ws.Cell(i + 2, 6).Value = a.Stage;
                ws.Cell(i + 2, 7).Value = a.Status.ToString();
            }
            ws.Columns().AdjustToContents();

            return (ToBytes(wb), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"applications_{club.Code}{suffix}.xlsx");
        }

        public async Task<(byte[] Content, string ContentType, string FileName)> ExportAllUsersAsync(string format, UserListQuery? request = null)
        {
            request ??= new UserListQuery();
            var now = DateTimeOffset.UtcNow;
            var query = _db.Users.AsNoTracking().AsQueryable();
            query = ApplyUserFilters(query, request);
            query = ApplyUserSort(query, request.SortBy, request.SortDir);

            var users = await query
                .Select(u => new
                {
                    Id        = u.Id,
                    FullName  = u.FullName ?? "",
                    Email     = u.Email ?? "",
                    StudentId = u.StudentId ?? "",
                    Major     = u.Major ?? "",
                    IsLocked  = u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now
                })
                .ToListAsync();

            var userIds = users.Select(u => u.Id).ToList();
            var rolesByUser = await _db.UserRoles
                .Where(ur => userIds.Contains(ur.UserId))
                .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, RoleName = r.Name ?? "" })
                .GroupBy(x => x.UserId)
                .ToDictionaryAsync(g => g.Key, g => string.Join(", ", g.Select(x => x.RoleName).Where(r => r != "")));

            string[] headers = ["STT", "Họ tên", "Email", "MSSV", "Chuyên ngành", "Vai trò", "Trạng thái"];
            var date = DateTime.Now.ToString("yyyyMMdd");

            if (format == "csv")
            {
                var csv = BuildCsv(headers, users.Select((u, i) => new object?[]
                    { i + 1, u.FullName, u.Email, u.StudentId, u.Major, rolesByUser.GetValueOrDefault(u.Id, ""), u.IsLocked ? "Locked" : "Active" }));
                return (ToCsvBytes(csv), "text/csv", $"users_{date}.csv");
            }

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Người dùng");
            WriteExcelHeaders(ws, headers);
            for (int i = 0; i < users.Count; i++)
            {
                var u = users[i];
                ws.Cell(i + 2, 1).Value = i + 1;
                ws.Cell(i + 2, 2).Value = u.FullName;
                ws.Cell(i + 2, 3).Value = u.Email;
                ws.Cell(i + 2, 4).Value = u.StudentId;
                ws.Cell(i + 2, 5).Value = u.Major;
                ws.Cell(i + 2, 6).Value = rolesByUser.GetValueOrDefault(u.Id, "");
                ws.Cell(i + 2, 7).Value = u.IsLocked ? "Locked" : "Active";
            }
            ws.Columns().AdjustToContents();
            return (ToBytes(wb), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"users_{date}.xlsx");
        }

        public async Task<(byte[] Content, string ContentType, string FileName)> ExportAllClubsAsync(string format, AdminClubListQuery? request = null)
        {
            request ??= new AdminClubListQuery();
            var query = _db.Clubs
                .AsNoTracking()
                .AsQueryable();

            query = ApplyClubFilters(query, request);
            query = ApplyClubSort(query, request.SortBy, request.SortDir);

            var clubs = await query
                .Select(c => new
                {
                    c.Name,
                    c.Code,
                    CategoryName = c.Category != null ? c.Category.Name : "",
                    Status = c.Status.ToString(),
                    MemberCount = c.ClubMemberships!.Count(m => m.Status == MembershipStatus.Active),
                    CreatedAt = c.CreatedAt.ToString("dd/MM/yyyy"),
                })
                .ToListAsync();

            string[] headers = ["STT", "Tên CLB", "Mã", "Lĩnh vực", "Trạng thái", "Thành viên", "Ngày tạo"];
            var date = DateTime.Now.ToString("yyyyMMdd");

            if (format == "csv")
            {
                var csv = BuildCsv(headers, clubs.Select((c, i) => new object?[]
                {
                    i + 1, c.Name, c.Code, c.CategoryName, c.Status, c.MemberCount, c.CreatedAt
                }));
                return (ToCsvBytes(csv), "text/csv", $"clubs_{date}.csv");
            }

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Câu lạc bộ");
            WriteExcelHeaders(ws, headers);
            for (int i = 0; i < clubs.Count; i++)
            {
                var c = clubs[i];
                ws.Cell(i + 2, 1).Value = i + 1;
                ws.Cell(i + 2, 2).Value = c.Name;
                ws.Cell(i + 2, 3).Value = c.Code;
                ws.Cell(i + 2, 4).Value = c.CategoryName;
                ws.Cell(i + 2, 5).Value = c.Status;
                ws.Cell(i + 2, 6).Value = c.MemberCount;
                ws.Cell(i + 2, 7).Value = c.CreatedAt;
            }
            ws.Columns().AdjustToContents();
            return (ToBytes(wb), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"clubs_{date}.xlsx");
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private IQueryable<ClubMembership> ApplyMemberFilters(IQueryable<ClubMembership> query, MemberListQuery? request)
        {
            if (request == null)
                return query;

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLower();
                query = query.Where(m =>
                    (m.User.FullName != null && m.User.FullName.ToLower().Contains(s)) ||
                    (m.User.Email != null && m.User.Email.ToLower().Contains(s)) ||
                    (m.User.StudentId != null && m.User.StudentId.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(request.Role) &&
                Enum.TryParse<ClubRole>(request.Role, true, out var parsedRole))
                query = query.Where(m => m.ClubRole == parsedRole);

            if (!string.IsNullOrWhiteSpace(request.Status) &&
                Enum.TryParse<MembershipStatus>(request.Status, true, out var parsedStatus))
                query = query.Where(m => m.Status == parsedStatus);

            if (request.DepartmentId.HasValue)
            {
                if (request.DepartmentId.Value == -1)
                    query = query.Where(m => m.DepartmentId == null && m.ClubRole != ClubRole.CLUB_ADMIN);
                else
                    query = query.Where(m => m.DepartmentId == request.DepartmentId);
            }

            return query;
        }

        private static IQueryable<ClubMembership> ApplyMemberSort(IQueryable<ClubMembership> query, string? sortBy, string? sortDir)
        {
            var key = (sortBy ?? "name").Trim().ToLower();
            var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            var orderedQuery = key switch
            {
                "email" => desc ? query.OrderByDescending(m => m.User.Email) : query.OrderBy(m => m.User.Email),
                "studentid" => desc ? query.OrderByDescending(m => m.User.StudentId) : query.OrderBy(m => m.User.StudentId),
                "role" => desc ? query.OrderByDescending(m => m.ClubRole) : query.OrderBy(m => m.ClubRole),
                "department" => desc ? query.OrderByDescending(m => m.Department != null ? m.Department.Name : "") : query.OrderBy(m => m.Department != null ? m.Department.Name : ""),
                "status" => desc ? query.OrderByDescending(m => m.Status) : query.OrderBy(m => m.Status),
                "joineddate" => desc ? query.OrderByDescending(m => m.JoinedDate) : query.OrderBy(m => m.JoinedDate),
                _ => desc ? query.OrderByDescending(m => m.User.FullName ?? m.User.Email) : query.OrderBy(m => m.User.FullName ?? m.User.Email),
            };
            return orderedQuery.ThenBy(m => m.Id);
        }

        private IQueryable<ClubApplication> ApplyApplicationFilters(IQueryable<ClubApplication> query, ApplicationListQuery request)
        {
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLower();
                query = query.Where(a =>
                    (a.User.FullName != null && a.User.FullName.ToLower().Contains(s)) ||
                    (a.User.Email != null && a.User.Email.ToLower().Contains(s)) ||
                    (a.User.StudentId != null && a.User.StudentId.ToLower().Contains(s)) ||
                    (a.CurrentStage != null && a.CurrentStage.Name.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(request.Status) &&
                Enum.TryParse<ApplicationStatus>(request.Status, true, out var parsedStatus))
                query = query.Where(a => a.Status == parsedStatus);

            if (request.StageId.HasValue)
                query = query.Where(a => a.CurrentStageId == request.StageId);

            if (request.DateFrom.HasValue)
                query = query.Where(a => a.AppliedAt >= request.DateFrom.Value.Date);

            if (request.DateTo.HasValue)
            {
                var nextDay = request.DateTo.Value.Date.AddDays(1);
                query = query.Where(a => a.AppliedAt < nextDay);
            }

            return query;
        }

        private static IQueryable<ClubApplication> ApplyApplicationSort(IQueryable<ClubApplication> query, string? sortBy, string? sortDir)
        {
            var key = (sortBy ?? "appliedAt").Trim().ToLower();
            var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            var orderedQuery = key switch
            {
                "name" => desc ? query.OrderByDescending(a => a.User.FullName ?? a.User.Email) : query.OrderBy(a => a.User.FullName ?? a.User.Email),
                "email" => desc ? query.OrderByDescending(a => a.User.Email) : query.OrderBy(a => a.User.Email),
                "status" => desc ? query.OrderByDescending(a => a.Status) : query.OrderBy(a => a.Status),
                "stage" => desc ? query.OrderByDescending(a => a.CurrentStage != null ? a.CurrentStage.Name : "") : query.OrderBy(a => a.CurrentStage != null ? a.CurrentStage.Name : ""),
                _ => desc ? query.OrderByDescending(a => a.AppliedAt) : query.OrderBy(a => a.AppliedAt),
            };
            return orderedQuery.ThenBy(a => a.Id);
        }

        private IQueryable<ApplicationUser> ApplyUserFilters(IQueryable<ApplicationUser> query, UserListQuery request)
        {
            var now = DateTimeOffset.UtcNow;

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLower();
                query = query.Where(u =>
                    (u.FullName != null && u.FullName.ToLower().Contains(s)) ||
                    (u.Email != null && u.Email.ToLower().Contains(s)) ||
                    (u.StudentId != null && u.StudentId.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                var status = request.Status.Trim().ToLower();
                if (status == "locked")
                    query = query.Where(u => u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now);
                else if (status == "active")
                    query = query.Where(u => !(u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now));
            }

            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var role = request.Role.Trim().ToUpper();
                query = query.Where(u =>
                    _db.UserRoles.Any(ur => ur.UserId == u.Id &&
                        _db.Roles.Any(r => r.Id == ur.RoleId && r.NormalizedName == role)));
            }

            return query;
        }

        private IQueryable<ApplicationUser> ApplyUserSort(IQueryable<ApplicationUser> query, string? sortBy, string? sortDir)
        {
            var now = DateTimeOffset.UtcNow;
            var key = (sortBy ?? "name").Trim().ToLower();
            var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            var orderedQuery = key switch
            {
                "email" => desc ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
                "role" => desc
                    ? query.OrderByDescending(u => _db.UserRoles
                        .Where(ur => ur.UserId == u.Id)
                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (_, r) => r.Name)
                        .OrderBy(name => name)
                        .FirstOrDefault())
                    : query.OrderBy(u => _db.UserRoles
                        .Where(ur => ur.UserId == u.Id)
                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (_, r) => r.Name)
                        .OrderBy(name => name)
                        .FirstOrDefault()),
                "status" => desc
                    ? query.OrderByDescending(u => u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now)
                    : query.OrderBy(u => u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now),
                _ => desc ? query.OrderByDescending(u => u.FullName ?? u.Email) : query.OrderBy(u => u.FullName ?? u.Email),
            };
            return orderedQuery.ThenBy(u => u.Id);
        }

        private static IQueryable<Club> ApplyClubFilters(IQueryable<Club> query, AdminClubListQuery request)
        {
            if (request.CategoryId.HasValue)
                query = query.Where(c => c.CategoryId == request.CategoryId);

            if (!string.IsNullOrWhiteSpace(request.Status) &&
                Enum.TryParse<ClubStatus>(request.Status, true, out var parsedStatus))
                query = query.Where(c => c.Status == parsedStatus);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(s) ||
                    c.Code.ToLower().Contains(s) ||
                    (c.Description != null && c.Description.ToLower().Contains(s)) ||
                    (c.AdvisorName != null && c.AdvisorName.ToLower().Contains(s)) ||
                    (c.ContactInfo != null && c.ContactInfo.ToLower().Contains(s)));
            }

            return query;
        }

        private static IQueryable<Club> ApplyClubSort(IQueryable<Club> query, string? sortBy, string? sortDir)
        {
            var key = (sortBy ?? "id").Trim().ToLower();
            var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            var orderedQuery = key switch
            {
                "name" => desc ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name),
                "code" => desc ? query.OrderByDescending(c => c.Code) : query.OrderBy(c => c.Code),
                "members" => desc
                    ? query.OrderByDescending(c => c.ClubMemberships!.Count(m => m.Status == MembershipStatus.Active))
                    : query.OrderBy(c => c.ClubMemberships!.Count(m => m.Status == MembershipStatus.Active)),
                "status" => desc ? query.OrderByDescending(c => c.Status) : query.OrderBy(c => c.Status),
                "createdat" => desc ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt),
                _ => desc ? query.OrderByDescending(c => c.Id) : query.OrderBy(c => c.Id),
            };
            return orderedQuery.ThenBy(c => c.Id);
        }

        private static void WriteExcelHeaders(IXLWorksheet ws, string[] headers)
        {
            for (int i = 0; i < headers.Length; i++)
            {
                var cell = ws.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#4472C4");
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }
        }

        private static byte[] ToBytes(XLWorkbook wb)
        {
            using var stream = new MemoryStream();
            wb.SaveAs(stream);
            return stream.ToArray();
        }

        private static string BuildCsv(string[] headers, IEnumerable<object?[]> rows)
        {
            var sb = new StringBuilder();
            sb.AppendLine(string.Join(",", headers.Select(EscapeCsv)));
            foreach (var row in rows)
                sb.AppendLine(string.Join(",", row.Select(v => EscapeCsv(v?.ToString()))));
            return sb.ToString();
        }

        private static byte[] ToCsvBytes(string csv) =>
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetBytes(csv);

        private static string EscapeCsv(string? value)
        {
            if (string.IsNullOrEmpty(value)) return "";

            if (value[0] is '=' or '+' or '-' or '@')
                value = $"'{value}";

            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
                return $"\"{value.Replace("\"", "\"\"")}\"";

            return value;
        }
    }
}
