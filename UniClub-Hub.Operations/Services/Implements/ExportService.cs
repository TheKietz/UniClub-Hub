using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class ExportService(UniClubDbContext db, IKpiService kpiService) : IExportService
    {
        private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        private const string PdfContentType = "application/pdf";

        // ── Tasks report ────────────────────────────────────────────────────────
        public async Task<(byte[] Content, string ContentType, string FileName)> ExportTasksAsync(
            int clubId, DateTime? from, DateTime? to, string format, string requesterId)
        {
            await RequireClubAdminAsync(requesterId, clubId);

            var club = await db.Clubs.AsNoTracking()
                .Where(c => c.Id == clubId)
                .Select(c => new { c.Code, c.Name })
                .FirstOrDefaultAsync() ?? throw new KeyNotFoundException("Không tìm thấy CLB.");

            var (fromUtc, toExclusive) = DateBounds(from, to);

            var taskQuery = db.Tasks.AsNoTracking().Where(t => t.ClubId == clubId && !t.IsDeleted);
            if (fromUtc.HasValue) taskQuery = taskQuery.Where(t => t.CreatedAt >= fromUtc.Value);
            if (toExclusive.HasValue) taskQuery = taskQuery.Where(t => t.CreatedAt < toExclusive.Value);

            var tasks = await taskQuery
                .OrderBy(t => t.Deadline)
                .Select(t => new TaskRow
                {
                    Title = t.Title,
                    AssigneeId = t.AssignedTo,
                    AssigneeName = t.Assignee != null ? (t.Assignee.FullName ?? t.Assignee.Email ?? "") : "",
                    Deadline = t.Deadline,
                    Status = t.Status,
                    Progress = t.Progress,
                    EstimatedHours = t.EstimatedHours,
                    ActualHours = t.ActualHours,
                })
                .ToListAsync();

            var code = string.IsNullOrEmpty(club.Code) ? clubId.ToString() : club.Code;

            if (format == "pdf")
                return (BuildTasksPdf(club.Name, tasks), PdfContentType, $"bao-cao-cong-viec_{code}.pdf");

            // Excel: 3 sheets (tasks, workload, events)
            var events = await db.Events.AsNoTracking()
                .Where(e => e.ClubId == clubId && !e.IsDeleted)
                .OrderByDescending(e => e.StartTime)
                .Select(e => new EventRow
                {
                    Name = e.Name,
                    Status = e.Status.ToString(),
                    StartTime = e.StartTime,
                    Participants = db.EventRegistrations.Count(r => r.EventId == e.Id),
                })
                .ToListAsync();

            return (BuildTasksWorkbook(club.Name, tasks, events), XlsxContentType, $"bao-cao-cong-viec_{code}.xlsx");
        }

        // ── Department KPI report ───────────────────────────────────────────────
        public async Task<(byte[] Content, string ContentType, string FileName)> ExportDepartmentKpiAsync(
            int departmentId, int clubId, DateTime? from, DateTime? to, string requesterId)
        {
            // GetDepartmentKpiAsync enforces the DEPT_LEAD / CLUB_ADMIN permission itself.
            var kpi = await kpiService.GetDepartmentKpiAsync(departmentId, clubId, requesterId, null);

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("KPI ban");
            string[] headers = ["STT", "Thành viên", "Tổng việc", "Hoàn thành", "Đang làm", "Trễ hạn",
                                "Giờ dự kiến", "Giờ thực tế", "Tỉ lệ HT (%)", "Đúng hạn (%)", "Điểm"];
            WriteHeaders(ws, headers);

            for (int i = 0; i < kpi.Members.Count; i++)
            {
                var m = kpi.Members[i];
                ws.Cell(i + 2, 1).Value = i + 1;
                ws.Cell(i + 2, 2).Value = m.FullName;
                ws.Cell(i + 2, 3).Value = m.TotalTasks;
                ws.Cell(i + 2, 4).Value = m.CompletedTasks;
                ws.Cell(i + 2, 5).Value = m.ActiveTasks;
                ws.Cell(i + 2, 6).Value = m.OverdueTasks;
                ws.Cell(i + 2, 7).Value = m.TotalEstimatedHours ?? 0;
                ws.Cell(i + 2, 8).Value = m.TotalActualHours ?? 0;
                ws.Cell(i + 2, 9).Value = m.CompletionRate;
                ws.Cell(i + 2, 10).Value = m.OnTimeRate;
                ws.Cell(i + 2, 11).Value = m.ProductivityScore;
            }
            ws.Columns().AdjustToContents();

            var safeName = string.Concat((kpi.DepartmentName ?? $"ban-{departmentId}")
                .Split(Path.GetInvalidFileNameChars()));
            return (ToBytes(wb), XlsxContentType, $"kpi_{safeName}.xlsx");
        }

        // ── Audit-log report ────────────────────────────────────────────────────
        public async Task<(byte[] Content, string ContentType, string FileName)> ExportAuditLogsAsync(
            int clubId, DateTime? from, DateTime? to, string requesterId)
        {
            await RequireClubAdminAsync(requesterId, clubId);

            var club = await db.Clubs.AsNoTracking()
                .Where(c => c.Id == clubId).Select(c => new { c.Code }).FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy CLB.");

            // Audit rows are club-scoped via the entity ids that belong to this club.
            var taskIds = await db.Tasks.Where(t => t.ClubId == clubId).Select(t => t.Id.ToString()).ToListAsync();
            var eventIds = await db.Events.Where(e => e.ClubId == clubId).Select(e => e.Id.ToString()).ToListAsync();
            var sprintIds = await db.Sprints.Where(s => s.ClubId == clubId).Select(s => s.Id.ToString()).ToListAsync();

            var (fromUtc, toExclusive) = DateBounds(from, to);

            var query = db.AuditLogs.AsNoTracking().Where(a =>
                (a.EntityName == "ClubTask" && taskIds.Contains(a.EntityId)) ||
                (a.EntityName == "ClubEvent" && eventIds.Contains(a.EntityId)) ||
                (a.EntityName == "Sprint" && sprintIds.Contains(a.EntityId)));
            if (fromUtc.HasValue) query = query.Where(a => a.Timestamp >= fromUtc.Value);
            if (toExclusive.HasValue) query = query.Where(a => a.Timestamp < toExclusive.Value);

            var logs = await query.OrderByDescending(a => a.Timestamp).ToListAsync();

            var userIds = logs.Where(l => l.UserId != null).Select(l => l.UserId!).Distinct().ToList();
            var users = await db.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName })
                .ToDictionaryAsync(u => u.Id, u => u.FullName ?? "");

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Nhật ký hoạt động");
            string[] headers = ["STT", "Thời gian", "Người thực hiện", "Hành động", "Loại", "Mã đối tượng"];
            WriteHeaders(ws, headers);

            for (int i = 0; i < logs.Count; i++)
            {
                var l = logs[i];
                ws.Cell(i + 2, 1).Value = i + 1;
                ws.Cell(i + 2, 2).Value = l.Timestamp.ToString("dd/MM/yyyy HH:mm");
                ws.Cell(i + 2, 3).Value = l.UserId != null ? users.GetValueOrDefault(l.UserId, "Hệ thống") : "Hệ thống";
                ws.Cell(i + 2, 4).Value = ActionLabel(l.Action);
                ws.Cell(i + 2, 5).Value = ModuleLabel(l.EntityName);
                ws.Cell(i + 2, 6).Value = l.EntityId;
            }
            ws.Columns().AdjustToContents();

            var code = string.IsNullOrEmpty(club.Code) ? clubId.ToString() : club.Code;
            return (ToBytes(wb), XlsxContentType, $"nhat-ky_{code}.xlsx");
        }

        // ── Builders ────────────────────────────────────────────────────────────
        private static byte[] BuildTasksWorkbook(string clubName, List<TaskRow> tasks, List<EventRow> events)
        {
            using var wb = new XLWorkbook();

            // Sheet 1 — task list
            var ws1 = wb.Worksheets.Add("Công việc");
            string[] taskHeaders = ["STT", "Tiêu đề", "Người thực hiện", "Deadline", "Trạng thái", "Tiến độ (%)"];
            WriteHeaders(ws1, taskHeaders);
            for (int i = 0; i < tasks.Count; i++)
            {
                var t = tasks[i];
                ws1.Cell(i + 2, 1).Value = i + 1;
                ws1.Cell(i + 2, 2).Value = t.Title;
                ws1.Cell(i + 2, 3).Value = string.IsNullOrEmpty(t.AssigneeName) ? "(Chưa giao)" : t.AssigneeName;
                ws1.Cell(i + 2, 4).Value = t.Deadline?.ToString("dd/MM/yyyy") ?? "";
                ws1.Cell(i + 2, 5).Value = StatusLabel(t.Status);
                ws1.Cell(i + 2, 6).Value = t.Progress;
            }
            ws1.Columns().AdjustToContents();

            // Sheet 2 — workload per member (grouped by primary assignee)
            var ws2 = wb.Worksheets.Add("Khối lượng");
            string[] workloadHeaders = ["STT", "Thành viên", "Tổng việc", "Hoàn thành", "Đang làm", "Giờ dự kiến", "Giờ thực tế"];
            WriteHeaders(ws2, workloadHeaders);
            var workload = tasks
                .Where(t => !string.IsNullOrEmpty(t.AssigneeId))
                .GroupBy(t => new { t.AssigneeId, t.AssigneeName })
                .Select(g => new
                {
                    Name = string.IsNullOrEmpty(g.Key.AssigneeName) ? g.Key.AssigneeId! : g.Key.AssigneeName,
                    Total = g.Count(),
                    Done = g.Count(t => t.Status == ClubTaskStatus.Done),
                    Active = g.Count(t => t.Status != ClubTaskStatus.Done),
                    Est = g.Sum(t => t.EstimatedHours ?? 0f),
                    Act = g.Sum(t => t.ActualHours ?? 0f),
                })
                .OrderByDescending(x => x.Total)
                .ToList();
            for (int i = 0; i < workload.Count; i++)
            {
                var w = workload[i];
                ws2.Cell(i + 2, 1).Value = i + 1;
                ws2.Cell(i + 2, 2).Value = w.Name;
                ws2.Cell(i + 2, 3).Value = w.Total;
                ws2.Cell(i + 2, 4).Value = w.Done;
                ws2.Cell(i + 2, 5).Value = w.Active;
                ws2.Cell(i + 2, 6).Value = w.Est;
                ws2.Cell(i + 2, 7).Value = w.Act;
            }
            ws2.Columns().AdjustToContents();

            // Sheet 3 — events + participant count
            var ws3 = wb.Worksheets.Add("Sự kiện");
            string[] eventHeaders = ["STT", "Tên sự kiện", "Thời gian", "Trạng thái", "Số người tham gia"];
            WriteHeaders(ws3, eventHeaders);
            for (int i = 0; i < events.Count; i++)
            {
                var e = events[i];
                ws3.Cell(i + 2, 1).Value = i + 1;
                ws3.Cell(i + 2, 2).Value = e.Name;
                ws3.Cell(i + 2, 3).Value = e.StartTime?.ToString("dd/MM/yyyy") ?? "";
                ws3.Cell(i + 2, 4).Value = e.Status;
                ws3.Cell(i + 2, 5).Value = e.Participants;
            }
            ws3.Columns().AdjustToContents();

            return ToBytes(wb);
        }

        private static byte[] BuildTasksPdf(string clubName, List<TaskRow> tasks)
        {
            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(28);
                    page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Arial));

                    page.Header().Column(col =>
                    {
                        col.Item().Text($"Báo cáo công việc — {clubName}").FontSize(16).Bold();
                        col.Item().Text($"Xuất ngày {DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(9).FontColor(Colors.Grey.Darken1);
                    });

                    page.Content().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(28);   // STT
                            c.RelativeColumn(3);     // Title
                            c.RelativeColumn(2);     // Assignee
                            c.RelativeColumn(1.4f);  // Deadline
                            c.RelativeColumn(1.4f);  // Status
                            c.RelativeColumn(1);     // Progress
                        });

                        table.Header(header =>
                        {
                            foreach (var h in new[] { "#", "Công việc", "Người thực hiện", "Deadline", "Trạng thái", "Tiến độ" })
                                header.Cell().Background(Colors.Blue.Medium).Padding(5)
                                    .Text(h).FontColor(Colors.White).Bold();
                        });

                        for (int i = 0; i < tasks.Count; i++)
                        {
                            var t = tasks[i];
                            var bg = i % 2 == 0 ? Colors.White : Colors.Grey.Lighten4;
                            table.Cell().Background(bg).Padding(4).Text((i + 1).ToString());
                            table.Cell().Background(bg).Padding(4).Text(t.Title);
                            table.Cell().Background(bg).Padding(4).Text(string.IsNullOrEmpty(t.AssigneeName) ? "(Chưa giao)" : t.AssigneeName);
                            table.Cell().Background(bg).Padding(4).Text(t.Deadline?.ToString("dd/MM/yyyy") ?? "—");
                            table.Cell().Background(bg).Padding(4).Text(StatusLabel(t.Status));
                            table.Cell().Background(bg).Padding(4).Text($"{t.Progress}%");
                        }
                    });

                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.CurrentPageNumber();
                        x.Span(" / ");
                        x.TotalPages();
                    });
                });
            }).GeneratePdf();
        }

        // ── Helpers ───────────────────────────────────────────────────────────────
        private async Task RequireClubAdminAsync(string userId, int clubId)
        {
            var isAdmin = await db.ClubMemberships.AsNoTracking().AnyAsync(m =>
                m.UserId == userId && m.ClubId == clubId &&
                m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);
            if (!isAdmin)
                throw new UnauthorizedAccessException("Chỉ Quản lý CLB mới có quyền xuất báo cáo.");
        }

        private static (DateTime? From, DateTime? ToExclusive) DateBounds(DateTime? from, DateTime? to) =>
            (from?.Date, to?.Date.AddDays(1));

        private static void WriteHeaders(IXLWorksheet ws, string[] headers)
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

        private static string StatusLabel(ClubTaskStatus s) => s switch
        {
            ClubTaskStatus.Todo => "Cần làm",
            ClubTaskStatus.Doing => "Đang làm",
            ClubTaskStatus.Reviewing => "Đang duyệt",
            ClubTaskStatus.Done => "Hoàn thành",
            _ => s.ToString(),
        };

        private static string ActionLabel(AuditAction a) => a switch
        {
            AuditAction.Create => "Tạo mới",
            AuditAction.Update => "Cập nhật",
            AuditAction.Delete => "Xóa",
            _ => a.ToString(),
        };

        private static string ModuleLabel(string entityName) => entityName switch
        {
            "ClubTask" => "Công việc",
            "ClubEvent" => "Sự kiện",
            "Sprint" => "Sprint",
            _ => entityName,
        };

        private sealed class TaskRow
        {
            public string Title { get; set; } = "";
            public string? AssigneeId { get; set; }
            public string AssigneeName { get; set; } = "";
            public DateTimeOffset? Deadline { get; set; }
            public ClubTaskStatus Status { get; set; }
            public int Progress { get; set; }
            public float? EstimatedHours { get; set; }
            public float? ActualHours { get; set; }
        }

        private sealed class EventRow
        {
            public string Name { get; set; } = "";
            public string Status { get; set; } = "";
            public DateTimeOffset? StartTime { get; set; }
            public int Participants { get; set; }
        }
    }
}
