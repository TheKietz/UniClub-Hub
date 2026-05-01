using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using System.Text;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ExportService : IExportService
    {
        private readonly UniClubDbContext _db;

        public ExportService(UniClubDbContext db)
        {
            _db = db;
        }

        public async Task<(byte[] Content, string ContentType, string FileName)> ExportMembersAsync(int clubId, string format)
        {
            var club = await _db.Clubs.FindAsync(clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy CLB.");

            var members = await _db.ClubMemberships
                .Where(m => m.ClubId == clubId)
                .OrderBy(m => m.Status)
                .ThenBy(m => m.ClubRole)
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
                return (Encoding.UTF8.GetBytes(csv), "text/csv", $"members_{club.Code}.csv");
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
                ws.Cell(i + 2, 6).Value = m.ClubRole;
                ws.Cell(i + 2, 7).Value = m.Department;
                ws.Cell(i + 2, 8).Value = m.JoinedDate;
                ws.Cell(i + 2, 9).Value = m.Status;
            }
            ws.Columns().AdjustToContents();

            return (ToBytes(wb), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"members_{club.Code}.xlsx");
        }

        public async Task<(byte[] Content, string ContentType, string FileName)> ExportApplicationsAsync(int clubId, string? status, string format)
        {
            var club = await _db.Clubs.FindAsync(clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy CLB.");

            var query = _db.Applications.Where(a => a.ClubId == clubId);
            if (!string.IsNullOrEmpty(status))
                query = query.Where(a => a.Status == status);

            var applications = await query
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new
                {
                    FullName  = a.User.FullName ?? a.User.Email ?? "",
                    Email     = a.User.Email ?? "",
                    StudentId = a.User.StudentId ?? "",
                    AppliedAt = a.AppliedAt.ToString("dd/MM/yyyy HH:mm"),
                    Status    = a.Status
                })
                .ToListAsync();

            string[] headers = ["STT", "Họ tên", "Email", "MSSV", "Ngày nộp đơn", "Trạng thái"];
            var suffix = string.IsNullOrEmpty(status) ? "" : $"_{status.ToLower()}";

            if (format == "csv")
            {
                var csv = BuildCsv(headers, applications.Select((a, i) => new object?[]
                    { i + 1, a.FullName, a.Email, a.StudentId, a.AppliedAt, a.Status }));
                return (Encoding.UTF8.GetBytes(csv), "text/csv", $"applications_{club.Code}{suffix}.csv");
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
                ws.Cell(i + 2, 6).Value = a.Status;
            }
            ws.Columns().AdjustToContents();

            return (ToBytes(wb), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"applications_{club.Code}{suffix}.xlsx");
        }

        // ── Helpers ──────────────────────────────────────────────────────────

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

        private static string EscapeCsv(string? value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
                return $"\"{value.Replace("\"", "\"\"")}\"";
            return value;
        }
    }
}
