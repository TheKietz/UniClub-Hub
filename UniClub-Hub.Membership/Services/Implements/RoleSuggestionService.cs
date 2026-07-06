using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Ai;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Membership.Services.Roles;
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
            await EnsureCanSuggestAsync(clubId, requesterUserId, isSuperAdmin);

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

            var context = await BuildContextAsync(membership, cancellationToken);
            var fallback = RoleSuggestionRules.BuildRuleBasedSuggestion(membership, context);

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
                        Confidence = RoleSuggestionRules.ClampConfidence(s.Confidence),
                        Reason = s.Reason.Trim(),
                    }
                );

                if (normalized.Count == 3)
                    break;
            }

            return normalized;
        }

        private static string BuildSystemPrompt() =>
            """
            Bạn là trợ lý quản trị câu lạc bộ sinh viên trong hệ thống UniClub Hub.
            Nhiệm vụ: gợi ý vai trò/vị trí phù hợp cho một thành viên, không tự quyết định thay người quản lý.
            Chỉ dùng các vai trò hợp lệ: CLUB_ADMIN, DEPT_LEAD, MEMBER.
            Nếu đề xuất DEPT_LEAD hoặc MEMBER, hãy ưu tiên departmentId có trong danh sách departments.
            Tránh đề xuất DEPT_LEAD cho ban đã có trưởng ban nếu không có lý do rõ ràng.

            Dữ liệu đầu vào bao gồm:
            - member: thông tin cơ bản, vai trò hiện tại, thâm niên
            - kpi: điểm KPI tổng hợp (totalScore), xếp loại (grade — label do CLB tự đặt), rank trong CLB, breakdown từng tiêu chí (3 tháng gần nhất)
            - positions: danh sách vị trí (position) thành viên đang giữ trong CLB
            - contribution: điểm đóng góp thủ công
            - tasks: thống kê hoàn thành công việc
            - departments: danh sách ban và trạng thái trưởng ban

            Hướng dẫn sử dụng KPI (dựa trên totalScore, không phụ thuộc label grade):
            - ≥90 điểm: ưu tiên đề xuất DEPT_LEAD nếu có ban trống trưởng
            - 75-89 điểm: có thể đề xuất DEPT_LEAD với điều kiện thêm (thâm niên, ban trống)
            - 60-74 điểm: chỉ đề xuất MEMBER, không đề xuất DEPT_LEAD
            - <60 điểm: gợi ý tập trung cải thiện KPI, không đề xuất nâng vai trò
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
