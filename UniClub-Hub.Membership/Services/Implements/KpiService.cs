using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Kpi;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Membership.Services.Kpi;
using MemberTaskStats = UniClub_Hub.Membership.Services.Kpi.MemberTaskStats;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class KpiService : IKpiService
    {
        private readonly UniClubDbContext _db;
        private readonly IClubPermissionService _permissions;

        public KpiService(UniClubDbContext db, IClubPermissionService permissions)
        {
            _db = db;
            _permissions = permissions;
        }

        public async Task<KpiConfigDto> GetOrCreateConfigAsync(int clubId, string userId, bool isSuperAdmin)
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId,
                userId,
                isSuperAdmin,
                ClubPermissions.MemberKpiManage
            );

            var config = await GetOrCreateConfigEntityAsync(clubId);
            return MapConfig(config);
        }

        public async Task<KpiConfigDto> UpdateCriteriaAsync(
            int clubId,
            List<UpdateKpiCriteriaDto> criteria,
            string userId,
            bool isSuperAdmin
        )
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId,
                userId,
                isSuperAdmin,
                ClubPermissions.MemberKpiManage
            );

            KpiCalculator.ValidateCriteriaPayload(criteria);

            var config = await GetOrCreateConfigEntityAsync(clubId);
            var byMetric = config.Criteria.ToDictionary(c => c.MetricKey);

            foreach (var dto in criteria)
            {
                if (!byMetric.TryGetValue(dto.MetricKey, out var item))
                {
                    item = new KpiCriteria { MetricKey = dto.MetricKey };
                    config.Criteria.Add(item);
                    byMetric[dto.MetricKey] = item;
                }

                item.DisplayName = dto.DisplayName.Trim();
                item.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
                item.Weight = dto.Weight;
                item.IsEnabled = dto.IsEnabled;
            }

            KpiCalculator.ValidateTotalWeight(config.Criteria);
            Touch(config, userId);
            await _db.SaveChangesAsync();

            return MapConfig(config);
        }

        public async Task<KpiConfigDto> ToggleCriteriaAsync(
            int clubId,
            KpiMetricKey metricKey,
            bool isEnabled,
            string userId,
            bool isSuperAdmin
        )
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId,
                userId,
                isSuperAdmin,
                ClubPermissions.MemberKpiManage
            );

            var config = await GetOrCreateConfigEntityAsync(clubId);
            var criterion = config.Criteria.FirstOrDefault(c => c.MetricKey == metricKey)
                ?? throw new KeyNotFoundException($"Không tìm thấy tiêu chí KPI {metricKey}.");

            criterion.IsEnabled = isEnabled;
            KpiCalculator.ValidateTotalWeight(config.Criteria);
            Touch(config, userId);
            await _db.SaveChangesAsync();

            return MapConfig(config);
        }

        public async Task<KpiConfigDto> UpdateGradesAsync(
            int clubId,
            UpdateKpiGradesDto dto,
            string userId,
            bool isSuperAdmin
        )
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId,
                userId,
                isSuperAdmin,
                ClubPermissions.MemberKpiManage
            );

            KpiCalculator.ValidateGradesPayload(dto.Grades);

            var config = await GetOrCreateConfigEntityAsync(clubId);
            var existingGrades = config.Grades.ToList();
            _db.KpiGradeConfigs.RemoveRange(existingGrades);
            config.Grades.Clear();

            var order = 0;
            foreach (var grade in dto.Grades.OrderByDescending(g => g.MinScore))
            {
                config.Grades.Add(new KpiGradeConfig
                {
                    Label = grade.Label.Trim(),
                    MinScore = grade.MinScore,
                    Color = string.IsNullOrWhiteSpace(grade.Color) ? null : grade.Color.Trim(),
                    DisplayOrder = order++,
                });
            }

            Touch(config, userId);
            await _db.SaveChangesAsync();

            return MapConfig(config);
        }

        public async Task<KpiResultsDto> GetResultsAsync(
            int clubId,
            int? departmentId,
            DateOnly? fromDate,
            DateOnly? toDate,
            string userId,
            bool isSuperAdmin
        )
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId,
                userId,
                isSuperAdmin,
                ClubPermissions.MemberKpiView
            );

            return await CalculateResultsAsync(clubId, departmentId, fromDate, toDate, null);
        }

        public async Task<MemberKpiResultDto> GetMyResultAsync(
            int clubId,
            DateOnly? fromDate,
            DateOnly? toDate,
            string userId,
            bool isSuperAdmin
        )
        {
            var hasMembership = await _db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId &&
                m.UserId == userId &&
                (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation));

            if (!hasMembership && !isSuperAdmin)
            {
                throw new UnauthorizedAccessException();
            }

            var result = await CalculateResultsAsync(clubId, null, fromDate, toDate, userId);
            return result.Members.FirstOrDefault()
                ?? throw new KeyNotFoundException("Không tìm thấy dữ liệu KPI của thành viên trong CLB này.");
        }

        private async Task<KpiResultsDto> CalculateResultsAsync(
            int clubId,
            int? departmentId,
            DateOnly? fromDate,
            DateOnly? toDate,
            string? onlyUserId
        )
        {
            var (from, to, startDateTime, endDateTime, startOffset, endOffset) = KpiCalculator.NormalizePeriod(fromDate, toDate);
            var config = await GetOrCreateConfigEntityAsync(clubId);
            var criteria = config.Criteria
                .Where(c => c.IsEnabled)
                .OrderBy(c => c.MetricKey)
                .ToList();
            var grades = config.Grades
                .OrderByDescending(g => g.MinScore)
                .ThenBy(g => g.DisplayOrder)
                .ToList();

            KpiCalculator.ValidateTotalWeight(config.Criteria);

            var memberQuery = _db.ClubMemberships
                .AsNoTracking()
                .Where(m =>
                    m.ClubId == clubId &&
                    (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation));

            if (departmentId.HasValue)
                memberQuery = memberQuery.Where(m => m.DepartmentId == departmentId);

            if (!string.IsNullOrEmpty(onlyUserId))
                memberQuery = memberQuery.Where(m => m.UserId == onlyUserId);

            var members = await memberQuery
                .Include(m => m.User)
                .Include(m => m.Department)
                .OrderBy(m => m.Department != null ? m.Department.Name : "")
                .ThenBy(m => m.User.FullName)
                .Select(m => new MemberProjection(
                    m.Id,
                    m.UserId,
                    m.User.FullName,
                    m.User.Email,
                    m.User.AvatarUrl,
                    m.DepartmentId,
                    m.Department != null ? m.Department.Name : null,
                    m.ClubRole
                ))
                .ToListAsync();

            var userIds = members.Select(m => m.UserId).ToHashSet();

            var taskQuery = _db.Tasks
                .AsNoTracking()
                .Where(t => t.ClubId == clubId);

            if (departmentId.HasValue)
                taskQuery = taskQuery.Where(t => t.DepartmentId == departmentId);

            taskQuery = taskQuery.Where(t =>
                (t.CreatedAt >= startDateTime && t.CreatedAt < endDateTime) ||
                (t.CompletedAt.HasValue && t.CompletedAt.Value >= startOffset && t.CompletedAt.Value < endOffset) ||
                (t.Deadline.HasValue && t.Deadline.Value >= startOffset && t.Deadline.Value < endOffset));

            var tasks = await taskQuery
                .Select(t => new TaskProjection(
                    t.Id,
                    t.AssignedTo,
                    t.Status,
                    t.Progress,
                    t.Deadline,
                    t.CompletedAt
                ))
                .ToListAsync();

            var taskIds = tasks.Select(t => t.Id).ToList();
            var taskAssignees = taskIds.Count == 0
                ? new List<TaskAssigneeProjection>()
                : await _db.TaskAssignees
                    .AsNoTracking()
                    .Where(a => taskIds.Contains(a.TaskId))
                    .Select(a => new TaskAssigneeProjection(a.TaskId, a.UserId))
                    .ToListAsync();

            var assigneesByTask = taskAssignees
                .GroupBy(a => a.TaskId)
                .ToDictionary(g => g.Key, g => g.Select(a => a.UserId).ToHashSet());

            var taskStats = userIds.ToDictionary(userId => userId, _ => new MemberTaskStats());
            foreach (var task in tasks)
            {
                var assignedUsers = new HashSet<string>();
                if (!string.IsNullOrWhiteSpace(task.AssignedTo))
                    assignedUsers.Add(task.AssignedTo);
                if (assigneesByTask.TryGetValue(task.Id, out var extraAssignees))
                    assignedUsers.UnionWith(extraAssignees);

                foreach (var assignedUser in assignedUsers.Where(userIds.Contains))
                {
                    var stats = taskStats[assignedUser];
                    stats.Total += 1;
                    stats.ProgressSum += task.Progress;

                    if (task.Status == ClubTaskStatus.Done)
                    {
                        stats.Done += 1;
                        var isOnTime =
                            !task.Deadline.HasValue ||
                            (task.CompletedAt.HasValue && task.CompletedAt.Value <= task.Deadline.Value);
                        if (isOnTime) stats.OnTimeDone += 1;
                    }

                    if (task.Deadline.HasValue && task.Deadline.Value < DateTimeOffset.UtcNow && task.Status != ClubTaskStatus.Done)
                        stats.Overdue += 1;
                }
            }

            var contributionQuery = _db.Contributions
                .AsNoTracking()
                .Where(c =>
                    c.ClubId == clubId &&
                    userIds.Contains(c.UserId) &&
                    c.RecordedAt >= startOffset &&
                    c.RecordedAt < endOffset);

            if (departmentId.HasValue)
            {
                contributionQuery = contributionQuery.Where(c =>
                    c.TaskId == null || c.Task!.DepartmentId == departmentId);
            }

            var contributions = await contributionQuery
                .GroupBy(c => c.UserId)
                .Select(g => new { UserId = g.Key, Points = g.Sum(c => c.Points) })
                .ToDictionaryAsync(x => x.UserId, x => x.Points);

            var maxTaskCount = taskStats.Values.Select(s => s.Total).DefaultIfEmpty(0).Max();
            var results = new List<MemberKpiResultDto>();

            foreach (var member in members)
            {
                var stats = taskStats[member.UserId];
                contributions.TryGetValue(member.UserId, out var contributionPoints);

                var metricScores = criteria
                    .Select(c => KpiCalculator.ScoreMetric(c, stats, contributionPoints, maxTaskCount))
                    .ToList();

                var totalScore = Math.Round(metricScores.Sum(m => m.WeightedScore), 1);
                var grade = KpiCalculator.Grade(totalScore, grades);
                results.Add(new MemberKpiResultDto
                {
                    MembershipId = member.MembershipId,
                    UserId = member.UserId,
                    FullName = member.FullName,
                    Email = member.Email,
                    AvatarUrl = member.AvatarUrl,
                    DepartmentId = member.DepartmentId,
                    DepartmentName = member.DepartmentName,
                    ClubRole = member.ClubRole,
                    TotalScore = totalScore,
                    Grade = grade.Label,
                    GradeColor = grade.Color,
                    Metrics = metricScores,
                });
            }

            results = results
                .OrderByDescending(r => r.TotalScore)
                .ThenBy(r => r.FullName)
                .ToList();

            for (var i = 0; i < results.Count; i++)
                results[i].Rank = i + 1;

            return new KpiResultsDto
            {
                ClubId = clubId,
                DepartmentId = departmentId,
                FromDate = from,
                ToDate = to,
                TotalMembers = results.Count,
                AverageScore = Math.Round(results.Select(r => r.TotalScore).DefaultIfEmpty(0).Average(), 1),
                Members = results,
            };
        }

        private async Task<KpiConfig> GetOrCreateConfigEntityAsync(int clubId)
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");

            var config = await _db.KpiConfigs
                .Include(c => c.Criteria)
                .Include(c => c.Grades)
                .FirstOrDefaultAsync(c => c.ClubId == clubId);

            if (config == null)
            {
                config = new KpiConfig
                {
                    ClubId = clubId,
                    Criteria = DefaultCriteria(),
                    Grades = DefaultGrades(),
                };
                _db.KpiConfigs.Add(config);
                await _db.SaveChangesAsync();
                return config;
            }

            var existingKeys = config.Criteria.Select(c => c.MetricKey).ToHashSet();
            var changed = false;
            foreach (var item in DefaultCriteria().Where(c => !existingKeys.Contains(c.MetricKey)))
            {
                config.Criteria.Add(item);
                changed = true;
            }

            if (config.Grades.Count == 0)
            {
                foreach (var grade in DefaultGrades())
                    config.Grades.Add(grade);
                changed = true;
            }

            if (changed)
                await _db.SaveChangesAsync();

            return config;
        }

        private static List<KpiCriteria> DefaultCriteria() =>
        [
            new()
            {
                MetricKey = KpiMetricKey.TaskCompletion,
                DisplayName = "Hoàn thành công việc",
                Description = "Tỷ lệ task đã hoàn thành trên tổng task được giao trong kỳ.",
                Weight = 35,
                IsEnabled = true,
            },
            new()
            {
                MetricKey = KpiMetricKey.OnTimeCompletion,
                DisplayName = "Hoàn thành đúng hạn",
                Description = "Tỷ lệ task hoàn thành trước hoặc đúng deadline.",
                Weight = 25,
                IsEnabled = true,
            },
            new()
            {
                MetricKey = KpiMetricKey.AvgProgress,
                DisplayName = "Tiến độ trung bình",
                Description = "Tiến độ trung bình của các task trong kỳ.",
                Weight = 15,
                IsEnabled = true,
            },
            new()
            {
                MetricKey = KpiMetricKey.ContributionPoints,
                DisplayName = "Điểm đóng góp",
                Description = "Điểm đóng góp thủ công được ghi nhận cho thành viên.",
                Weight = 15,
                IsEnabled = true,
            },
            new()
            {
                MetricKey = KpiMetricKey.Workload,
                DisplayName = "Khối lượng công việc",
                Description = "Số task được giao, chuẩn hóa theo thành viên có workload cao nhất trong CLB.",
                Weight = 10,
                IsEnabled = true,
            },
        ];

        private static List<KpiGradeConfig> DefaultGrades() =>
        [
            new()
            {
                Label = "Xuất sắc",
                MinScore = 90,
                Color = "#16a34a",
                DisplayOrder = 0,
            },
            new()
            {
                Label = "Tốt",
                MinScore = 75,
                Color = "#4f46e5",
                DisplayOrder = 1,
            },
            new()
            {
                Label = "Đạt",
                MinScore = 60,
                Color = "#d97706",
                DisplayOrder = 2,
            },
            new()
            {
                Label = "Cần cải thiện",
                MinScore = 0,
                Color = "#dc2626",
                DisplayOrder = 3,
            },
        ];

        private static KpiConfigDto MapConfig(KpiConfig config)
        {
            var criteria = config.Criteria
                .OrderBy(c => c.MetricKey)
                .Select(c => new KpiCriteriaDto
                {
                    Id = c.Id,
                    MetricKey = c.MetricKey,
                    DisplayName = c.DisplayName,
                    Description = c.Description,
                    Weight = c.Weight,
                    IsEnabled = c.IsEnabled,
                })
                .ToList();

            return new KpiConfigDto
            {
                Id = config.Id,
                ClubId = config.ClubId,
                TotalWeight = criteria.Where(c => c.IsEnabled).Sum(c => c.Weight),
                UpdatedAt = config.UpdatedAt,
                UpdatedBy = config.UpdatedBy,
                Criteria = criteria,
                Grades = config.Grades
                    .OrderBy(g => g.DisplayOrder)
                    .ThenByDescending(g => g.MinScore)
                    .Select(g => new KpiGradeDto
                    {
                        Id = g.Id,
                        Label = g.Label,
                        MinScore = g.MinScore,
                        Color = g.Color,
                        DisplayOrder = g.DisplayOrder,
                    })
                    .ToList(),
            };
        }

        private static void Touch(KpiConfig config, string userId)
        {
            config.UpdatedAt = DateTimeOffset.UtcNow;
            config.UpdatedBy = userId;
        }

        private sealed record MemberProjection(
            int MembershipId,
            string UserId,
            string? FullName,
            string? Email,
            string? AvatarUrl,
            int? DepartmentId,
            string? DepartmentName,
            ClubRole ClubRole
        );

        private sealed record TaskProjection(
            int Id,
            string? AssignedTo,
            ClubTaskStatus Status,
            int Progress,
            DateTimeOffset? Deadline,
            DateTimeOffset? CompletedAt
        );

        private sealed record TaskAssigneeProjection(int TaskId, string UserId);
    }
}
