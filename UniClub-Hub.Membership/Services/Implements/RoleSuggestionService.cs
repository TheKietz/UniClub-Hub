using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Ai;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.AI;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class RoleSuggestionService : IRoleSuggestionService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        private readonly UniClubDbContext _db;
        private readonly IAiModelClient _aiModel;
        private readonly IClubPermissionService _permissions;
        private readonly IKpiService _kpiService;

        public RoleSuggestionService(
            UniClubDbContext db,
            IAiModelClient aiModel,
            IClubPermissionService permissions,
            IKpiService kpiService)
        {
            _db = db;
            _aiModel = aiModel;
            _permissions = permissions;
            _kpiService = kpiService;
        }

        public async Task<RoleSuggestionDto> SuggestRoleForMemberAsync(
            int clubId,
            int membershipId,
            string requesterUserId,
            bool isSuperAdmin,
            CancellationToken cancellationToken = default
        )
        {
            var membership =
                await _db
                    .ClubMemberships.AsNoTracking()
                    .Include(m => m.User)
                    .Include(m => m.Club)
                    .Include(m => m.Department)
                    .FirstOrDefaultAsync(
                        m => m.ClubId == clubId && m.Id == membershipId,
                        cancellationToken
                    )
                ?? throw new KeyNotFoundException("Không tìm thấy thành viên này trong CLB.");

            await EnsureCanSuggestAsync(clubId, requesterUserId, isSuperAdmin);

            var context = await BuildContextAsync(membership, cancellationToken);
            var fallback = BuildRuleBasedSuggestion(membership, context);

            if (!_aiModel.IsConfigured)
                return fallback;

            try
            {
                var json = await _aiModel.GenerateJsonAsync(
                    BuildSystemPrompt(),
                    JsonSerializer.Serialize(context, JsonOptions),
                    cancellationToken
                );
                var aiPayload = JsonSerializer.Deserialize<AiRoleSuggestionPayload>(json, JsonOptions);
                var suggestions = NormalizeAiSuggestions(aiPayload, context.Departments);

                if (suggestions.Count == 0)
                    return fallback;

                return new RoleSuggestionDto
                {
                    MembershipId = membership.Id,
                    UserId = membership.UserId,
                    MemberName = membership.User.FullName ?? membership.User.Email ?? membership.UserId,
                    AiEnabled = true,
                    Source = "Gemini",
                    Summary = string.IsNullOrWhiteSpace(aiPayload?.Summary)
                        ? fallback.Summary
                        : aiPayload.Summary,
                    Signals = aiPayload?.Signals?.Where(s => !string.IsNullOrWhiteSpace(s)).Take(5).ToList()
                        ?? fallback.Signals,
                    Suggestions = suggestions,
                };
            }
            catch
            {
                return fallback;
            }
        }

        private async Task EnsureCanSuggestAsync(
            int clubId,
            string requesterUserId,
            bool isSuperAdmin
        )
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId, requesterUserId, isSuperAdmin, ClubPermissions.RoleSuggestionsUse);
        }

        private async Task<RoleSuggestionContext> BuildContextAsync(
            ClubMembership membership,
            CancellationToken cancellationToken
        )
        {
            var departments = await _db
                .Departments.AsNoTracking()
                .Where(d => d.ClubId == membership.ClubId)
                .OrderBy(d => d.Name)
                .Select(d => new DepartmentSignal(d.Id, d.Name, d.Description))
                .ToListAsync(cancellationToken);

            var currentDeptLeadIds = await _db
                .ClubMemberships.AsNoTracking()
                .Where(m =>
                    m.ClubId == membership.ClubId
                    && m.ClubRole == ClubRole.DEPT_LEAD
                    && m.Status == MembershipStatus.Active
                    && m.DepartmentId.HasValue
                )
                .Select(m => m.DepartmentId!.Value)
                .Distinct()
                .ToListAsync(cancellationToken);

            var totalContributionPoints = await _db
                .Contributions.AsNoTracking()
                .Where(c => c.ClubId == membership.ClubId && c.UserId == membership.UserId)
                .SumAsync(c => (int?)c.Points, cancellationToken) ?? 0;

            var contributionCount = await _db
                .Contributions.AsNoTracking()
                .CountAsync(
                    c => c.ClubId == membership.ClubId && c.UserId == membership.UserId,
                    cancellationToken
                );

            var recentContributionNotes = await _db
                .Contributions.AsNoTracking()
                .Where(c =>
                    c.ClubId == membership.ClubId
                    && c.UserId == membership.UserId
                    && c.Note != null
                    && c.Note != ""
                )
                .OrderByDescending(c => c.RecordedAt)
                .Select(c => c.Note!)
                .Take(3)
                .ToListAsync(cancellationToken);

            var contribution = new ContributionSignal(
                totalContributionPoints,
                contributionCount,
                recentContributionNotes
            );

            var now = DateTimeOffset.UtcNow;
            var taskStats = await _db
                .Tasks.AsNoTracking()
                .Where(t => t.ClubId == membership.ClubId && t.AssignedTo == membership.UserId)
                .GroupBy(t => t.AssignedTo)
                .Select(g => new TaskSignal(
                    g.Count(),
                    g.Count(t => t.Status == ClubTaskStatus.Done),
                    g.Count(t => t.Deadline.HasValue && t.Deadline.Value < now && t.Status != ClubTaskStatus.Done),
                    g.Average(t => (double?)t.Progress) ?? 0
                ))
                .FirstOrDefaultAsync(cancellationToken)
                ?? new TaskSignal(0, 0, 0, 0);

            var latestApplication = await _db
                .Applications.AsNoTracking()
                .Where(a => a.ClubId == membership.ClubId && a.UserId == membership.UserId)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new ApplicationSignal(a.Answers, a.MemberFieldData, a.ReviewNote))
                .FirstOrDefaultAsync(cancellationToken);

            var kpi = await BuildKpiSignalAsync(membership, cancellationToken);
            var positions = await BuildPositionSignalsAsync(membership.Id, cancellationToken);

            return new RoleSuggestionContext(
                new ClubSignal(membership.ClubId, membership.Club.Name, membership.Club.Description),
                new MemberSignal(
                    membership.Id,
                    membership.UserId,
                    membership.User.FullName ?? membership.User.Email ?? membership.UserId,
                    membership.User.StudentId,
                    membership.User.Major,
                    membership.ClubRole.ToString(),
                    membership.DepartmentId,
                    membership.Department?.Name,
                    membership.Status.ToString(),
                    membership.JoinedDate,
                    membership.MemberCustomData
                ),
                departments,
                currentDeptLeadIds,
                contribution,
                taskStats,
                latestApplication,
                kpi,
                positions
            );
        }

        private async Task<KpiSignal?> BuildKpiSignalAsync(
            ClubMembership membership,
            CancellationToken cancellationToken)
        {
            try
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var fromDate = today.AddMonths(-3);

                // isSuperAdmin=true bypasses membership auth check — safe here since
                // this is an internal call from a permission-gated suggestion flow.
                var result = await _kpiService.GetMyResultAsync(
                    membership.ClubId,
                    fromDate,
                    today,
                    membership.UserId,
                    isSuperAdmin: true);

                return new KpiSignal(
                    result.TotalScore,
                    result.Grade,
                    result.Rank,
                    result.Metrics.Select(m => new MetricSnapshot(
                        m.MetricKey.ToString(),
                        m.DisplayName,
                        m.RawScore,
                        m.Weight
                    )).ToList()
                );
            }
            catch
            {
                return null;
            }
        }

        private async Task<List<PositionSignal>> BuildPositionSignalsAsync(
            int membershipId,
            CancellationToken cancellationToken)
        {
            return await _db.ClubMemberPositions
                .AsNoTracking()
                .Include(p => p.Position)
                    .ThenInclude(pos => pos.Department)
                .Where(p => p.MembershipId == membershipId)
                .Select(p => new PositionSignal(
                    p.PositionId,
                    p.Position.Name,
                    p.Position.Department != null ? p.Position.Department.Name : null
                ))
                .ToListAsync(cancellationToken);
        }

        private static RoleSuggestionDto BuildRuleBasedSuggestion(
            ClubMembership membership,
            RoleSuggestionContext context
        )
        {
            var activeDays = DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - membership.JoinedDate.DayNumber;
            var completionRate = context.Tasks.Total > 0
                ? (double)context.Tasks.Done / context.Tasks.Total
                : 0;

            var kpiGrade = context.Kpi?.Grade;
            bool hasStrongPerformance;
            double deptLeadConfidenceBase;

            if (kpiGrade != null)
            {
                hasStrongPerformance = kpiGrade is "Xuất sắc" or "Tốt";
                deptLeadConfidenceBase = kpiGrade switch
                {
                    "Xuất sắc" => 0.85,
                    "Tốt"      => 0.72,
                    "Đạt"      => 0.55,
                    _          => 0.30,
                };
            }
            else
            {
                hasStrongPerformance = context.Contribution.TotalPoints >= 30 || completionRate >= 0.7;
                deptLeadConfidenceBase = ClampConfidence(0.62 + completionRate * 0.2 + Math.Min(context.Contribution.TotalPoints, 60) / 300.0);
            }

            var holdsDeptLeadPosition = context.Positions.Any(p =>
                p.Name.Contains("trưởng", StringComparison.OrdinalIgnoreCase) ||
                p.Name.Contains("lead", StringComparison.OrdinalIgnoreCase) ||
                p.Name.Contains("phụ trách", StringComparison.OrdinalIgnoreCase));

            if (holdsDeptLeadPosition && kpiGrade is "Xuất sắc" or "Tốt")
                deptLeadConfidenceBase = Math.Min(deptLeadConfidenceBase + 0.08, 0.95);

            var preferredDepartment = PickDepartment(context);
            var suggestions = new List<RoleSuggestionItemDto>();

            bool canSuggestDeptLead =
                kpiGrade != "Cần cải thiện"
                && preferredDepartment is not null
                && !context.CurrentDeptLeadDepartmentIds.Contains(preferredDepartment.Id)
                && membership.ClubRole != ClubRole.CLUB_ADMIN
                && activeDays >= 30
                && hasStrongPerformance;

            if (canSuggestDeptLead)
            {
                suggestions.Add(new RoleSuggestionItemDto
                {
                    Role = ClubRole.DEPT_LEAD,
                    DepartmentId = preferredDepartment!.Id,
                    DepartmentName = preferredDepartment.Name,
                    Confidence = ClampConfidence(deptLeadConfidenceBase),
                    Reason = BuildDeptLeadReason(context, kpiGrade, holdsDeptLeadPosition),
                });
            }

            if (preferredDepartment is not null)
            {
                var memberConfidence = kpiGrade switch
                {
                    "Xuất sắc" => 0.80,
                    "Tốt"      => 0.74,
                    "Đạt"      => 0.65,
                    "Cần cải thiện" => 0.50,
                    _          => hasStrongPerformance ? 0.74 : 0.58,
                };

                suggestions.Add(new RoleSuggestionItemDto
                {
                    Role = ClubRole.MEMBER,
                    DepartmentId = preferredDepartment.Id,
                    DepartmentName = preferredDepartment.Name,
                    Confidence = memberConfidence,
                    Reason = "Phù hợp để tiếp tục phát triển chuyên môn trong ban gần với hồ sơ và dữ liệu tham gia.",
                });
            }

            if (suggestions.Count == 0)
            {
                suggestions.Add(new RoleSuggestionItemDto
                {
                    Role = ClubRole.MEMBER,
                    DepartmentId = membership.DepartmentId,
                    DepartmentName = membership.Department?.Name,
                    Confidence = 0.52,
                    Reason = "Chưa đủ dữ liệu để đề xuất vai trò cao hơn; nên tiếp tục theo dõi mức độ tham gia.",
                });
            }

            var signals = new List<string>
            {
                $"Thâm niên: {Math.Max(activeDays, 0)} ngày",
                $"Điểm đóng góp: {context.Contribution.TotalPoints}",
                $"Task hoàn thành: {context.Tasks.Done}/{context.Tasks.Total}",
            };
            if (context.Kpi != null)
                signals.Add($"KPI (3 tháng gần nhất): {context.Kpi.TotalScore:F1} điểm — {context.Kpi.Grade}");
            if (context.Positions.Count > 0)
                signals.Add($"Vị trí đang giữ: {string.Join(", ", context.Positions.Select(p => p.Name))}");

            return new RoleSuggestionDto
            {
                MembershipId = membership.Id,
                UserId = membership.UserId,
                MemberName = membership.User.FullName ?? membership.User.Email ?? membership.UserId,
                AiEnabled = false,
                Source = "Rules",
                Summary = BuildRuleBasedSummary(kpiGrade, hasStrongPerformance, activeDays),
                Signals = signals,
                Suggestions = suggestions.Take(3).ToList(),
            };
        }

        private static string BuildDeptLeadReason(
            RoleSuggestionContext context,
            string? kpiGrade,
            bool holdsDeptLeadPosition)
        {
            var parts = new List<string>();
            if (kpiGrade is "Xuất sắc" or "Tốt")
                parts.Add($"kết quả KPI {kpiGrade.ToLowerInvariant()}");
            if (holdsDeptLeadPosition)
                parts.Add("đang giữ vị trí có trách nhiệm lãnh đạo");
            if (!context.CurrentDeptLeadDepartmentIds.Contains(context.Member.DepartmentId ?? -1))
                parts.Add("ban này chưa có trưởng ban đang hoạt động");

            return parts.Count > 0
                ? $"Thành viên có {string.Join(", ", parts)}."
                : "Thành viên có tín hiệu đóng góp tốt và ban này chưa có trưởng ban đang hoạt động.";
        }

        private static string BuildRuleBasedSummary(string? kpiGrade, bool hasStrongPerformance, int activeDays)
        {
            if (kpiGrade == "Xuất sắc")
                return "Thành viên đạt kết quả KPI xuất sắc — đủ điều kiện xem xét vai trò lãnh đạo.";
            if (kpiGrade == "Tốt")
                return "Thành viên có kết quả KPI tốt và thâm niên đủ để đảm nhận trách nhiệm cao hơn.";
            if (kpiGrade == "Đạt")
                return "Thành viên đạt KPI ở mức cơ bản; nên tiếp tục theo dõi trước khi nâng vai trò.";
            if (kpiGrade == "Cần cải thiện")
                return "KPI hiện tại cần cải thiện — không khuyến nghị nâng vai trò lúc này.";
            if (hasStrongPerformance && activeDays >= 30)
                return "Gợi ý được tạo bằng luật nội bộ dựa trên dữ liệu đóng góp và công việc.";
            return "Chưa đủ dữ liệu KPI; gợi ý dựa trên tín hiệu hoạt động cơ bản.";
        }

        private static DepartmentSignal? PickDepartment(RoleSuggestionContext context)
        {
            if (context.Member.DepartmentId.HasValue)
                return context.Departments.FirstOrDefault(d => d.Id == context.Member.DepartmentId);

            // Use position's department if available
            var positionDept = context.Positions
                .Where(p => p.DepartmentName != null)
                .Select(p => context.Departments.FirstOrDefault(d => d.Name == p.DepartmentName))
                .FirstOrDefault(d => d != null);
            if (positionDept != null)
                return positionDept;

            var text = string.Join(
                " ",
                context.Member.Major,
                context.Member.CustomDataJson,
                context.Application?.AnswersJson,
                context.Application?.MemberFieldDataJson
            ).ToLowerInvariant();

            return context.Departments.FirstOrDefault(d =>
                    text.Contains(d.Name.ToLowerInvariant(), StringComparison.Ordinal)
                )
                ?? context.Departments.FirstOrDefault();
        }

        private static List<RoleSuggestionItemDto> NormalizeAiSuggestions(
            AiRoleSuggestionPayload? payload,
            List<DepartmentSignal> departments
        )
        {
            if (payload?.Suggestions is null)
                return [];

            var normalized = new List<RoleSuggestionItemDto>();

            foreach (var s in payload.Suggestions)
            {
                if (
                    !Enum.TryParse<ClubRole>(s.Role, true, out var role)
                    || string.IsNullOrWhiteSpace(s.Reason)
                )
                    continue;

                var department = s.DepartmentId.HasValue
                    ? departments.FirstOrDefault(d => d.Id == s.DepartmentId.Value)
                    : departments.FirstOrDefault(d =>
                        !string.IsNullOrWhiteSpace(s.DepartmentName)
                        && d.Name.Equals(s.DepartmentName, StringComparison.OrdinalIgnoreCase)
                    );

                normalized.Add(
                    new RoleSuggestionItemDto
                    {
                        Role = role,
                        DepartmentId = role == ClubRole.CLUB_ADMIN ? null : department?.Id,
                        DepartmentName = role == ClubRole.CLUB_ADMIN
                            ? null
                            : department?.Name ?? s.DepartmentName,
                        Confidence = ClampConfidence(s.Confidence),
                        Reason = s.Reason.Trim(),
                    }
                );

                if (normalized.Count == 3)
                    break;
            }

            return normalized;
        }

        private static double ClampConfidence(double confidence) =>
            Math.Round(Math.Min(Math.Max(confidence, 0.0), 1.0), 2);

        private static string BuildSystemPrompt() =>
            """
            Bạn là trợ lý quản trị câu lạc bộ sinh viên trong hệ thống UniClub Hub.
            Nhiệm vụ: gợi ý vai trò/vị trí phù hợp cho một thành viên, không tự quyết định thay người quản lý.
            Chỉ dùng các vai trò hợp lệ: CLUB_ADMIN, DEPT_LEAD, MEMBER.
            Nếu đề xuất DEPT_LEAD hoặc MEMBER, hãy ưu tiên departmentId có trong danh sách departments.
            Tránh đề xuất DEPT_LEAD cho ban đã có trưởng ban nếu không có lý do rõ ràng.

            Dữ liệu đầu vào bao gồm:
            - member: thông tin cơ bản, vai trò hiện tại, thâm niên
            - kpi: điểm KPI tổng hợp, xếp loại (Xuất sắc/Tốt/Đạt/Cần cải thiện), breakdown từng tiêu chí (3 tháng gần nhất)
            - positions: danh sách vị trí (position) thành viên đang giữ trong CLB
            - contribution: điểm đóng góp thủ công
            - tasks: thống kê hoàn thành công việc
            - departments: danh sách ban và trạng thái trưởng ban

            Hướng dẫn sử dụng KPI:
            - "Xuất sắc" (≥90đ): ưu tiên đề xuất DEPT_LEAD nếu có ban trống trưởng
            - "Tốt" (75-89đ): có thể đề xuất DEPT_LEAD với điều kiện thêm (thâm niên, ban trống)
            - "Đạt" (60-74đ): chỉ đề xuất MEMBER, không đề xuất DEPT_LEAD
            - "Cần cải thiện" (<60đ): gợi ý tập trung cải thiện KPI, không đề xuất nâng vai trò
            - Nếu kpi=null: suy luận từ contribution và tasks

            Hướng dẫn sử dụng positions:
            - Vị trí có từ "trưởng"/"lead"/"phụ trách" là dấu hiệu năng lực lãnh đạo → tăng confidence DEPT_LEAD

            Trả về JSON theo schema:
            {
              "summary": "nhận xét ngắn 1-2 câu",
              "signals": ["tín hiệu 1", "tín hiệu 2"],
              "suggestions": [
                {
                  "role": "MEMBER|DEPT_LEAD|CLUB_ADMIN",
                  "departmentId": 1,
                  "departmentName": "Tên ban",
                  "confidence": 0.75,
                  "reason": "lý do ngắn, dựa trên dữ liệu KPI/vị trí/đóng góp"
                }
              ]
            }
            """;

        // ── Records ────────────────────────────────────────────────────────────

        private sealed record RoleSuggestionContext(
            ClubSignal Club,
            MemberSignal Member,
            List<DepartmentSignal> Departments,
            List<int> CurrentDeptLeadDepartmentIds,
            ContributionSignal Contribution,
            TaskSignal Tasks,
            ApplicationSignal? Application,
            KpiSignal? Kpi,
            List<PositionSignal> Positions
        );

        private sealed record ClubSignal(int Id, string Name, string? Description);

        private sealed record MemberSignal(
            int MembershipId,
            string UserId,
            string Name,
            string? StudentId,
            string? Major,
            string CurrentRole,
            int? DepartmentId,
            string? DepartmentName,
            string Status,
            DateOnly JoinedDate,
            string? CustomDataJson
        );

        private sealed record DepartmentSignal(int Id, string Name, string? Description);

        private sealed record ContributionSignal(int TotalPoints, int Count, List<string> RecentNotes);

        private sealed record TaskSignal(int Total, int Done, int Overdue, double AverageProgress);

        private sealed record ApplicationSignal(
            string? AnswersJson,
            string? MemberFieldDataJson,
            string? ReviewNote
        );

        private sealed record KpiSignal(
            double TotalScore,
            string Grade,
            int Rank,
            List<MetricSnapshot> Metrics
        );

        private sealed record MetricSnapshot(
            string Key,
            string DisplayName,
            double RawScore,
            int Weight
        );

        private sealed record PositionSignal(
            int Id,
            string Name,
            string? DepartmentName
        );

        private sealed class AiRoleSuggestionPayload
        {
            public string? Summary { get; set; }
            public List<string>? Signals { get; set; }
            public List<AiRoleSuggestionItem>? Suggestions { get; set; }
        }

        private sealed class AiRoleSuggestionItem
        {
            public string? Role { get; set; }
            public int? DepartmentId { get; set; }
            public string? DepartmentName { get; set; }
            public double Confidence { get; set; }
            public string? Reason { get; set; }
        }
    }
}
