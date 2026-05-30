using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Kpi;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class KpiService(UniClubDbContext db) : IKpiService
    {
        public async Task<PersonalKpiResponse> GetPersonalKpiAsync(
            string userId, int clubId, int? departmentId, int? sprintId)
        {
            var query = db.Tasks
                .AsNoTracking()
                .Where(t => t.ClubId == clubId && !t.IsDeleted)
                .Where(t => t.AssignedTo == userId || t.Assignees.Any(a => a.UserId == userId));

            if (departmentId.HasValue)
                query = query.Where(t => t.DepartmentId == departmentId);

            if (sprintId.HasValue)
                query = query.Where(t => t.SprintId == sprintId);

            var tasks = await query
                .Select(t => new
                {
                    t.Status,
                    t.Priority,
                    t.Deadline,
                    t.CompletedAt,
                    t.EstimatedHours,
                    t.ActualHours,
                })
                .ToListAsync();

            var user = await db.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new { u.FullName })
                .FirstOrDefaultAsync();

            var total = tasks.Count;
            var completed = tasks.Count(t => t.Status == ClubTaskStatus.Done);
            var overdue = tasks.Count(t =>
                t.Status == ClubTaskStatus.Done &&
                t.CompletedAt.HasValue && t.Deadline.HasValue &&
                t.CompletedAt > t.Deadline);
            var todo = tasks.Count(t => t.Status == ClubTaskStatus.Todo);
            var doing = tasks.Count(t => t.Status == ClubTaskStatus.Doing);

            var score = tasks
                .Where(t => t.Status == ClubTaskStatus.Done)
                .Sum(t => t.Priority switch
                {
                    TaskPriority.High => 3,
                    TaskPriority.Medium => 2,
                    _ => 1,
                });

            var estHours = tasks.Any(t => t.EstimatedHours.HasValue)
                ? (float?)tasks.Sum(t => t.EstimatedHours ?? 0f)
                : null;
            var actHours = tasks.Any(t => t.ActualHours.HasValue)
                ? (float?)tasks.Sum(t => t.ActualHours ?? 0f)
                : null;

            return new PersonalKpiResponse
            {
                UserId = userId,
                FullName = user?.FullName ?? string.Empty,
                TotalTasks = total,
                CompletedTasks = completed,
                OverdueTasks = overdue,
                ActiveTasks = todo + doing,
                TodoTasks = todo,
                DoingTasks = doing,
                TotalEstimatedHours = estHours,
                TotalActualHours = actHours,
                CompletionRate = total > 0 ? Math.Round(completed / (double)total * 100, 1) : 0,
                OnTimeRate = completed > 0 ? Math.Round((completed - overdue) / (double)completed * 100, 1) : 0,
                ProductivityScore = score,
                HighPriorityTasks = tasks.Count(t => t.Priority == TaskPriority.High),
                MediumPriorityTasks = tasks.Count(t => t.Priority == TaskPriority.Medium),
                LowPriorityTasks = tasks.Count(t => t.Priority == TaskPriority.Low),
            };
        }

        public async Task<DepartmentKpiResponse> GetDepartmentKpiAsync(
            int departmentId, int clubId, string requesterId, int? sprintId)
        {
            await RequireManagerRoleAsync(requesterId, clubId);

            var deptName = await db.Departments
                .AsNoTracking()
                .Where(d => d.Id == departmentId)
                .Select(d => d.Name)
                .FirstOrDefaultAsync() ?? string.Empty;

            var memberIds = await db.ClubMemberships
                .AsNoTracking()
                .Where(m => m.ClubId == clubId && m.DepartmentId == departmentId && m.Status == MembershipStatus.Active)
                .Select(m => m.UserId)
                .Distinct()
                .ToListAsync();

            var taskQuery = db.Tasks
                .AsNoTracking()
                .Where(t => t.ClubId == clubId && t.DepartmentId == departmentId && !t.IsDeleted);

            if (sprintId.HasValue)
                taskQuery = taskQuery.Where(t => t.SprintId == sprintId);

            var tasks = await taskQuery
                .Select(t => new
                {
                    t.Id,
                    t.Status,
                    t.Priority,
                    t.Deadline,
                    t.CompletedAt,
                    t.EstimatedHours,
                    t.ActualHours,
                    t.AssignedTo,
                })
                .ToListAsync();

            var taskIds = tasks.Select(t => t.Id).ToList();

            // Build a map: userId → set of taskIds assigned via TaskAssignee (multi-assignee)
            var assigneeGroups = await db.TaskAssignees
                .AsNoTracking()
                .Where(ta => taskIds.Contains(ta.TaskId))
                .Select(ta => new { ta.UserId, ta.TaskId })
                .ToListAsync();

            var assigneeMap = assigneeGroups
                .GroupBy(x => x.UserId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.TaskId).ToHashSet());

            var users = await db.Users
                .AsNoTracking()
                .Where(u => memberIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName, u.AvatarUrl })
                .ToDictionaryAsync(u => u.Id);

            var members = memberIds.Select(uid =>
            {
                var memberTasks = tasks.Where(t =>
                    t.AssignedTo == uid ||
                    (assigneeMap.TryGetValue(uid, out var ids) && ids.Contains(t.Id))
                ).ToList();

                var user = users.GetValueOrDefault(uid);
                var tot = memberTasks.Count;
                var comp = memberTasks.Count(t => t.Status == ClubTaskStatus.Done);
                var late = memberTasks.Count(t =>
                    t.Status == ClubTaskStatus.Done &&
                    t.CompletedAt.HasValue && t.Deadline.HasValue &&
                    t.CompletedAt > t.Deadline);
                var pts = memberTasks
                    .Where(t => t.Status == ClubTaskStatus.Done)
                    .Sum(t => t.Priority switch
                    {
                        TaskPriority.High => 3,
                        TaskPriority.Medium => 2,
                        _ => 1,
                    });

                var estH = memberTasks.Any(t => t.EstimatedHours.HasValue)
                    ? (float?)memberTasks.Sum(t => t.EstimatedHours ?? 0f)
                    : null;
                var actH = memberTasks.Any(t => t.ActualHours.HasValue)
                    ? (float?)memberTasks.Sum(t => t.ActualHours ?? 0f)
                    : null;

                return new DepartmentMemberKpiRow
                {
                    UserId = uid,
                    FullName = user?.FullName ?? string.Empty,
                    AvatarUrl = user?.AvatarUrl,
                    TotalTasks = tot,
                    CompletedTasks = comp,
                    ActiveTasks = tot - comp,
                    OverdueTasks = late,
                    TotalEstimatedHours = estH,
                    TotalActualHours = actH,
                    CompletionRate = tot > 0 ? Math.Round(comp / (double)tot * 100, 1) : 0,
                    OnTimeRate = comp > 0 ? Math.Round((comp - late) / (double)comp * 100, 1) : 0,
                    ProductivityScore = pts,
                };
            })
            .OrderByDescending(r => r.ProductivityScore)
            .ToList();

            var totalDept = tasks.Count;
            var completedDept = tasks.Count(t => t.Status == ClubTaskStatus.Done);

            return new DepartmentKpiResponse
            {
                DepartmentId = departmentId,
                DepartmentName = deptName,
                TotalTasks = totalDept,
                CompletedTasks = completedDept,
                DeptCompletionRate = totalDept > 0 ? Math.Round(completedDept / (double)totalDept * 100, 1) : 0,
                Members = members,
            };
        }

        private async Task RequireManagerRoleAsync(string userId, int clubId)
        {
            var membership = await db.ClubMemberships
                .AsNoTracking()
                .FirstOrDefaultAsync(m =>
                    m.UserId == userId &&
                    m.ClubId == clubId &&
                    m.Status == MembershipStatus.Active);

            if (membership == null ||
                (membership.ClubRole != ClubRole.DEPT_LEAD && membership.ClubRole != ClubRole.CLUB_ADMIN))
            {
                throw new UnauthorizedAccessException("Chỉ Trưởng ban hoặc Quản lý CLB mới có quyền xem KPI toàn ban.");
            }
        }
    }
}
