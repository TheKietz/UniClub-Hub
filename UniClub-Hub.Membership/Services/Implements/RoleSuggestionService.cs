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

        public RoleSuggestionService(UniClubDbContext db, IAiModelClient aiModel, IClubPermissionService permissions)
        {
            _db = db;
            _aiModel = aiModel;
            _permissions = permissions;
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

            await EnsureCanSuggestAsync(clubId, membership, requesterUserId, isSuperAdmin);

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
                        : aiPayload!.Summary!,
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
            ClubMembership target,
            string requesterUserId,
            bool isSuperAdmin
        )
        {
            _ = target; // target reserved for future department-scoped checks
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
                latestApplication
            );
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
            var hasStrongContribution = context.Contribution.TotalPoints >= 30 || completionRate >= 0.7;
            var preferredDepartment = PickDepartment(context);
            var suggestions = new List<RoleSuggestionItemDto>();

            if (
                preferredDepartment is not null
                && !context.CurrentDeptLeadDepartmentIds.Contains(preferredDepartment.Id)
                && membership.ClubRole != ClubRole.CLUB_ADMIN
                && activeDays >= 30
                && hasStrongContribution
            )
            {
                suggestions.Add(new RoleSuggestionItemDto
                {
                    Role = ClubRole.DEPT_LEAD,
                    DepartmentId = preferredDepartment.Id,
                    DepartmentName = preferredDepartment.Name,
                    Confidence = ClampConfidence(0.62 + completionRate * 0.2 + Math.Min(context.Contribution.TotalPoints, 60) / 300.0),
                    Reason = "Thành viên có tín hiệu đóng góp tốt và ban này chưa có trưởng ban đang hoạt động.",
                });
            }

            if (preferredDepartment is not null)
            {
                suggestions.Add(new RoleSuggestionItemDto
                {
                    Role = ClubRole.MEMBER,
                    DepartmentId = preferredDepartment.Id,
                    DepartmentName = preferredDepartment.Name,
                    Confidence = hasStrongContribution ? 0.74 : 0.58,
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

            return new RoleSuggestionDto
            {
                MembershipId = membership.Id,
                UserId = membership.UserId,
                MemberName = membership.User.FullName ?? membership.User.Email ?? membership.UserId,
                AiEnabled = false,
                Source = "Rules",
                Summary = "Gợi ý được tạo bằng luật nội bộ vì AI model chưa cấu hình hoặc không phản hồi.",
                Signals =
                [
                    $"Thâm niên: {Math.Max(activeDays, 0)} ngày",
                    $"Điểm đóng góp: {context.Contribution.TotalPoints}",
                    $"Task hoàn thành: {context.Tasks.Done}/{context.Tasks.Total}",
                ],
                Suggestions = suggestions.Take(3).ToList(),
            };
        }

        private static DepartmentSignal? PickDepartment(RoleSuggestionContext context)
        {
            if (context.Member.DepartmentId.HasValue)
                return context.Departments.FirstOrDefault(d => d.Id == context.Member.DepartmentId);

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
            Trả về JSON theo schema:
            {
              "summary": "nhận xét ngắn",
              "signals": ["tín hiệu 1", "tín hiệu 2"],
              "suggestions": [
                {
                  "role": "MEMBER|DEPT_LEAD|CLUB_ADMIN",
                  "departmentId": 1,
                  "departmentName": "Tên ban",
                  "confidence": 0.75,
                  "reason": "lý do ngắn, dựa trên dữ liệu"
                }
              ]
            }
            """;

        private sealed record RoleSuggestionContext(
            ClubSignal Club,
            MemberSignal Member,
            List<DepartmentSignal> Departments,
            List<int> CurrentDeptLeadDepartmentIds,
            ContributionSignal Contribution,
            TaskSignal Tasks,
            ApplicationSignal? Application
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
