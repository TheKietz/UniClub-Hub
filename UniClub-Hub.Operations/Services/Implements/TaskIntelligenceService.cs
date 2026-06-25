using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Intelligence;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class TaskIntelligenceService(UniClubDbContext db) : ITaskIntelligenceService
    {
        // ── Feature 1: Gợi ý phân công ─────────────────────────────────────────
        // Score = (OnTimeRate × 0.4) + (ProductivityScore × 0.3) - (ActiveWorkloadHours × 0.5)
        public async Task<List<AssignmentSuggestionResponse>> SuggestAssigneesAsync(
            int clubId, int departmentId, float? estimatedHours, TaskPriority priority, int? sprintId)
        {
            var memberIds = await db.ClubMemberships
                .AsNoTracking()
                .Where(m => m.ClubId == clubId && m.DepartmentId == departmentId && m.Status == MembershipStatus.Active)
                .Select(m => m.UserId)
                .Distinct()
                .ToListAsync();

            if (memberIds.Count == 0)
                return [];

            var users = await db.Users
                .AsNoTracking()
                .Where(u => memberIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName, u.AvatarUrl })
                .ToDictionaryAsync(u => u.Id);

            // Historical KPI data: all completed tasks per member
            var allCompletedTasks = await db.Tasks
                .AsNoTracking()
                .Where(t => t.ClubId == clubId && t.DepartmentId == departmentId
                            && t.Status == ClubTaskStatus.Done && !t.IsDeleted)
                .Select(t => new
                {
                    t.AssignedTo,
                    t.Priority,
                    t.Deadline,
                    t.CompletedAt,
                })
                .ToListAsync();

            // Active workload: Todo or Doing tasks in the sprint (or all active if no sprint)
            var activeWorkloadQuery = db.Tasks
                .AsNoTracking()
                .Where(t => t.ClubId == clubId && t.DepartmentId == departmentId
                            && (t.Status == ClubTaskStatus.Todo || t.Status == ClubTaskStatus.Doing)
                            && !t.IsDeleted);

            if (sprintId.HasValue)
                activeWorkloadQuery = activeWorkloadQuery.Where(t => t.SprintId == sprintId);

            var activeWorkload = await activeWorkloadQuery
                .Select(t => new { t.AssignedTo, t.EstimatedHours })
                .ToListAsync();

            var results = new List<AssignmentSuggestionResponse>();

            foreach (var uid in memberIds)
            {
                var user = users.GetValueOrDefault(uid);

                // ── KPI from history ──────────────────────────────────────────
                var done = allCompletedTasks.Where(t => t.AssignedTo == uid).ToList();
                var completedCount = done.Count;
                var lateCount = done.Count(t =>
                    t.CompletedAt.HasValue && t.Deadline.HasValue && t.CompletedAt > t.Deadline);

                var onTimeRate = completedCount > 0
                    ? Math.Round((completedCount - lateCount) / (double)completedCount * 100, 1)
                    : 50.0; // neutral default for members with no history

                var productivityScore = done.Sum(t => t.Priority switch
                {
                    TaskPriority.High   => 3,
                    TaskPriority.Medium => 2,
                    _                   => 1,
                });

                // ── Active workload ───────────────────────────────────────────
                var activeHours = activeWorkload
                    .Where(t => t.AssignedTo == uid)
                    .Sum(t => t.EstimatedHours ?? 0f);

                // ── Suitability score ─────────────────────────────────────────
                var score = (onTimeRate * 0.4) + (productivityScore * 0.3) - (activeHours * 0.5);

                // ── Reason ────────────────────────────────────────────────────
                string reason;
                if (activeHours <= 1)
                    reason = "Đang rảnh nhất ban";
                else if (onTimeRate >= 90)
                    reason = $"Tỷ lệ đúng hạn {onTimeRate:F0}%";
                else if (productivityScore >= 10)
                    reason = "Năng suất cao";
                else
                    reason = $"Tải công việc hợp lý ({activeHours:F0}h đang thực hiện)";

                results.Add(new AssignmentSuggestionResponse
                {
                    UserId             = uid,
                    FullName           = user?.FullName ?? uid,
                    AvatarUrl          = user?.AvatarUrl,
                    SuitabilityScore   = Math.Round(score, 2),
                    Reason             = reason,
                    OnTimeRate         = onTimeRate,
                    ProductivityScore  = productivityScore,
                    CurrentWorkloadHours = activeHours,
                });
            }

            return [.. results.OrderByDescending(r => r.SuitabilityScore).Take(3)];
        }

        // ── Feature 3: Đề xuất ưu tiên ─────────────────────────────────────────
        // UrgencyIndex = (1 / hoursToDeadline) + PriorityWeight + (dependentsWaiting × 2)
        public async Task<List<UrgentTaskResponse>> GetUrgentTasksAsync(
            string userId, int clubId, int? departmentId, int? sprintId)
        {
            var taskQuery = db.Tasks
                .AsNoTracking()
                .Where(t => t.ClubId == clubId && !t.IsDeleted
                            && (t.Status == ClubTaskStatus.Todo || t.Status == ClubTaskStatus.Doing)
                            && (t.AssignedTo == userId || t.Assignees.Any(a => a.UserId == userId)));

            if (departmentId.HasValue)
                taskQuery = taskQuery.Where(t => t.DepartmentId == departmentId);

            if (sprintId.HasValue)
                taskQuery = taskQuery.Where(t => t.SprintId == sprintId);

            var tasks = await taskQuery
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Priority,
                    t.Status,
                    t.Deadline,
                    AssigneeName = t.Assignee != null ? t.Assignee.FullName : null,
                })
                .ToListAsync();

            if (tasks.Count == 0)
                return [];

            var taskIds = tasks.Select(t => t.Id).ToList();

            // Count how many other (non-Done) tasks are waiting on each task
            var dependentsMap = await db.TaskDependencies
                .AsNoTracking()
                .Where(td => taskIds.Contains(td.DependsOnTaskId)
                             && td.Task.Status != ClubTaskStatus.Done)
                .GroupBy(td => td.DependsOnTaskId)
                .Select(g => new { TaskId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.TaskId, x => x.Count);

            var now = DateTimeOffset.UtcNow;
            var results = new List<UrgentTaskResponse>();

            foreach (var t in tasks)
            {
                var hoursToDeadline = t.Deadline.HasValue
                    ? Math.Max((t.Deadline.Value - now).TotalHours, 0.001)
                    : double.MaxValue;

                var priorityWeight = t.Priority switch
                {
                    TaskPriority.High   => 3,
                    TaskPriority.Medium => 2,
                    _                   => 1,
                };

                var dependentsWaiting = dependentsMap.TryGetValue(t.Id, out var dw) ? dw : 0;

                // Guard: if no deadline, urgency driven only by priority and dependents
                var urgency = hoursToDeadline == double.MaxValue
                    ? priorityWeight + (dependentsWaiting * 2.0)
                    : (1.0 / hoursToDeadline) + priorityWeight + (dependentsWaiting * 2.0);

                string reason;
                if (dependentsWaiting > 0)
                    reason = $"Đang chặn {dependentsWaiting} công việc khác";
                else if (t.Deadline.HasValue && hoursToDeadline < 24)
                    reason = $"Hết hạn trong {(int)hoursToDeadline} giờ";
                else if (t.Priority == TaskPriority.High)
                    reason = "Ưu tiên cao";
                else
                    reason = "Cần hoàn thành sớm";

                results.Add(new UrgentTaskResponse
                {
                    TaskId           = t.Id,
                    Title            = t.Title,
                    Priority         = t.Priority,
                    Status           = t.Status,
                    Deadline         = t.Deadline,
                    AssigneeName     = t.AssigneeName,
                    DependentsWaiting = dependentsWaiting,
                    HoursToDeadline  = hoursToDeadline == double.MaxValue ? -1 : Math.Round(hoursToDeadline, 1),
                    UrgencyIndex     = Math.Round(urgency, 4),
                    UrgencyReason    = reason,
                });
            }

            return [.. results.OrderByDescending(r => r.UrgencyIndex).Take(3)];
        }
    }
}
