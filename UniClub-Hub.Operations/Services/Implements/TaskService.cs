using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Common.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class TaskService(
        UniClubDbContext db,
        INotificationService notifications,
        IContributionAwardService contributionAwardService,
        ILogger<TaskService> logger) : ITaskService
    {
        public async Task<PagedResult<TaskDto>> GetByClubAsync(
            int? clubId,
            string? status,
            int? sprintId,
            int? eventId,
            string? assignedTo,
            int? parentId,
            int? departmentId,
            int page,
            int pageSize,
            bool? unassigned = null
        )
        {
            var query = db.Tasks.AsNoTracking().Where(t => !t.IsDeleted);

            if (clubId.HasValue)
                query = query.Where(t => t.ClubId == clubId.Value);
            else if (eventId.HasValue)
                query = query.Where(t => t.EventId == eventId.Value);
            else
                return new PagedResult<TaskDto> { Items = [], TotalCount = 0, Page = page, PageSize = pageSize };

            if (unassigned == true)
                query = query.Where(t => t.DepartmentId == null);
            else if (departmentId.HasValue)
                query = query.Where(t => t.DepartmentId == departmentId);

            if (Enum.TryParse<ClubTaskStatus>(status, true, out var parsedStatus))
                query = query.Where(t => t.Status == parsedStatus);

            if (sprintId.HasValue)
                query = query.Where(t => t.SprintId == sprintId);

            if (eventId.HasValue)
                query = query.Where(t => t.EventId == eventId);

            if (!string.IsNullOrEmpty(assignedTo))
                query = query.Where(t => t.AssignedTo == assignedTo);

            if (parentId.HasValue)
                query = query.Where(t => t.ParentId == parentId);

            var total = await query.CountAsync();

            // Fetch base fields only — no correlated subqueries in SELECT
            var items = await query
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.Deadline)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new TaskDto
                {
                    Id = t.Id,
                    ClubId = t.ClubId,
                    ParentId = t.ParentId,
                    SprintId = t.SprintId,
                    EventId = t.EventId,
                    EventName = t.Event != null ? t.Event.Name : null,
                    DepartmentId = t.DepartmentId,
                    KanbanColumnId = t.KanbanColumnId,
                    Title = t.Title,
                    Description = t.Description,
                    Priority = t.Priority,
                    StartDate = t.StartDate,
                    Deadline = t.Deadline,
                    EstimatedHours = t.EstimatedHours,
                    ActualHours = t.ActualHours,
                    Status = t.Status,
                    Progress = t.Progress,
                    CompletedAt = t.CompletedAt,
                    AssignedTo = t.AssignedTo,
                    AssigneeName = t.Assignee != null ? t.Assignee.FullName : null,
                    CreatedBy = t.CreatedBy,
                    CreatedAt = t.CreatedAt,
                })
                .ToListAsync();

            if (items.Count == 0)
                return new PagedResult<TaskDto>
                {
                    Items = items,
                    TotalCount = total,
                    Page = page,
                    PageSize = pageSize,
                };

            var taskIds = items.ConvertAll(t => t.Id);

            // Batch query 1: subtask counts — one GROUP BY instead of N correlated subqueries
            var subTaskCounts = await db.Tasks
                .AsNoTracking()
                .Where(t => t.ParentId != null && taskIds.Contains(t.ParentId.Value))
                .GroupBy(t => t.ParentId!.Value)
                .Select(g => new { ParentId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ParentId, x => x.Count);

            // Batch query 2: blocking counts — one GROUP BY + WHERE IN instead of N correlated subqueries
            var blockingCounts = await db.TaskDependencies
                .AsNoTracking()
                .Where(td => taskIds.Contains(td.TaskId) && td.DependsOnTask.Status != ClubTaskStatus.Done)
                .GroupBy(td => td.TaskId)
                .Select(g => new { TaskId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.TaskId, x => x.Count);

            // Batch query 3: additional assignees — one WHERE IN instead of N correlated subqueries
            var assigneeRows = await db.TaskAssignees
                .AsNoTracking()
                .Where(a => taskIds.Contains(a.TaskId))
                .Select(a => new { a.TaskId, a.UserId })
                .ToListAsync();
            var assigneesByTask = assigneeRows
                .GroupBy(a => a.TaskId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.UserId).ToList());

            foreach (var item in items)
            {
                item.SubTaskCount = subTaskCounts.TryGetValue(item.Id, out var sc) ? sc : 0;
                var bc = blockingCounts.TryGetValue(item.Id, out var bcount) ? bcount : 0;
                item.BlockingCount = bc;
                item.IsBlocked = bc > 0;
                item.AssigneeIds = assigneesByTask.TryGetValue(item.Id, out var aids) ? aids : [];
            }

            return new PagedResult<TaskDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
            };
        }

        public async Task<TaskDto> GetByIdAsync(int id)
        {
            var t =
                await db
                    .Tasks.AsNoTracking()
                    .Include(t => t.Assignee)
                    .Include(t => t.SubTasks)
                    .Include(t => t.Event)
                    .FirstOrDefaultAsync(t => t.Id == id)
                ?? throw new KeyNotFoundException($"Task {id} not found.");

            var blockingCount = await db.TaskDependencies.CountAsync(td =>
                td.TaskId == id && td.DependsOnTask.Status != ClubTaskStatus.Done
            );

            var dto = MapToDto(t);
            dto.BlockingCount = blockingCount;
            dto.IsBlocked = blockingCount > 0;
            return dto;
        }

        private async Task GuardEventNotCompletedAsync(int? eventId)
        {
            if (!eventId.HasValue) return;
            var evStatus = await db.Events
                .AsNoTracking()
                .Where(e => e.Id == eventId.Value)
                .Select(e => (EventStatus?)e.Status)
                .FirstOrDefaultAsync();
            if (evStatus == EventStatus.Completed)
                throw new InvalidOperationException("Sự kiện đã hoàn thành. Không thể thêm hoặc chỉnh sửa công việc.");
        }

        // An event task's deadline is tied to its event: it must fall between now
        // and the event's end date. Only enforced when the deadline is (re)set,
        // so editing other fields of an overdue task keeps working.
        private async Task ValidateDeadlineWithinEventAsync(int? eventId, DateTimeOffset? deadline, bool deadlineChanged)
        {
            if (!eventId.HasValue || !deadline.HasValue) return;

            // 24h tolerance: date-only inputs arrive as midnight (timezone-shifted),
            // so "today" must not be rejected.
            if (deadlineChanged && deadline.Value < DateTimeOffset.UtcNow.AddDays(-1))
                throw new InvalidOperationException("Deadline không được trước thời điểm hiện tại.");

            var end = await db.Events
                .AsNoTracking()
                .Where(e => e.Id == eventId.Value)
                .Select(e => e.EndTime)
                .FirstOrDefaultAsync();

            if (end.HasValue && deadline.Value > end.Value)
                throw new InvalidOperationException("Deadline công việc không thể sau thời điểm kết thúc sự kiện.");
        }

        public async Task<TaskDto> CreateAsync(int clubId, CreateTaskDto dto, string createdBy)
        {
            await GuardEventNotCompletedAsync(dto.EventId);
            await ValidateDeadlineWithinEventAsync(dto.EventId, dto.Deadline?.ToUniversalTime(), deadlineChanged: true);

            // A sub-task must reference an existing parent, and only managers may
            // build parent/child dependencies.
            if (dto.ParentId.HasValue)
            {
                if (!await IsManagerAsync(createdBy, clubId))
                    throw new UnauthorizedAccessException(
                        "Chỉ Quản lý CLB hoặc Trưởng ban mới được thêm công việc phụ thuộc.");

                var parentExists = await db.Tasks.AnyAsync(t => t.Id == dto.ParentId.Value && !t.IsDeleted);
                if (!parentExists)
                    throw new KeyNotFoundException($"Parent task {dto.ParentId} not found.");
            }

            // When created inside a specific column, inherit that column's exact status.
            var status = ClubTaskStatus.Todo;
            if (dto.KanbanColumnId.HasValue)
            {
                var col = await db.KanbanColumns
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == dto.KanbanColumnId.Value);
                if (col is not null) status = col.Status;
            }

            var task = new ClubTask
            {
                ClubId = clubId,
                Title = dto.Title,
                Description = dto.Description,
                Priority = dto.Priority,
                StartDate = dto.StartDate?.ToUniversalTime(),
                Deadline = dto.Deadline?.ToUniversalTime(),
                EstimatedHours = dto.EstimatedHours,
                AssignedTo = dto.AssignedTo,
                EventId = dto.EventId,
                SprintId = dto.SprintId,
                DepartmentId = dto.DepartmentId,
                ParentId = dto.ParentId,
                KanbanColumnId = dto.KanbanColumnId,
                Status = status,
                CreatedBy = createdBy,
            };

            db.Tasks.Add(task);
            await db.SaveChangesAsync();

            // Notify the assignee (skip self-assignment by the creator).
            if (!string.IsNullOrEmpty(task.AssignedTo) && task.AssignedTo != createdBy)
                await notifications.SendAsync(
                    task.AssignedTo,
                    "Bạn được giao công việc mới",
                    $"Bạn được giao công việc: \"{task.Title}\".",
                    NotificationType.TaskAssigned,
                    relatedEntityType: "Task",
                    relatedEntityId: task.Id);

            return MapToDto(task);
        }

        public async Task<TaskDto> UpdateAsync(int id, UpdateTaskDto dto, string? actorId = null)
        {
            var task =
                await db.Tasks.FindAsync(id)
                ?? throw new KeyNotFoundException($"Task {id} not found.");

            // Members cannot edit task fields (title, labels, deadline, assignee, parent...).
            // actorId == null means an internal/trusted call (e.g. tests) — skip the check.
            if (actorId != null && !await IsManagerAsync(actorId, task.ClubId))
                throw new UnauthorizedAccessException(
                    "Chỉ Quản lý CLB hoặc Trưởng ban mới được chỉnh sửa nội dung công việc.");

            await GuardEventNotCompletedAsync(task.EventId);

            var newDeadline = dto.Deadline?.ToUniversalTime();
            await ValidateDeadlineWithinEventAsync(
                dto.EventId ?? task.EventId, newDeadline,
                deadlineChanged: task.Deadline != newDeadline);

            // Detect content edits (title, description, priority, dates) so the
            // assignee gets a "nội dung thay đổi" notification on their board.
            var contentChanged =
                task.Title != dto.Title ||
                task.Description != dto.Description ||
                task.Priority != dto.Priority ||
                task.StartDate != dto.StartDate?.ToUniversalTime() ||
                task.Deadline != dto.Deadline?.ToUniversalTime();

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.Priority = dto.Priority;
            task.StartDate = dto.StartDate?.ToUniversalTime();
            task.Deadline = dto.Deadline?.ToUniversalTime();
            task.EstimatedHours = dto.EstimatedHours;
            task.ActualHours = dto.ActualHours;
            task.AssignedTo = dto.AssignedTo;
            // A task never leaves its event via a partial PUT — omitting EventId must not clear it.
            if (dto.EventId.HasValue) task.EventId = dto.EventId;
            if (dto.SprintId.HasValue) task.SprintId = dto.SprintId;
            task.DepartmentId = dto.DepartmentId;

            if (dto.ParentId != task.ParentId)
            {
                if (dto.ParentId.HasValue)
                {
                    if (dto.ParentId.Value == id)
                        throw new InvalidOperationException("Công việc không thể là công việc con của chính nó.");
                    var parentExists = await db.Tasks.AnyAsync(t => t.Id == dto.ParentId.Value && !t.IsDeleted);
                    if (!parentExists)
                        throw new KeyNotFoundException($"Parent task {dto.ParentId} not found.");
                }
                task.ParentId = dto.ParentId;
            }

            await db.SaveChangesAsync();

            // Notify the assignee about content edits (skip self-edits).
            if (contentChanged && !string.IsNullOrEmpty(task.AssignedTo) && task.AssignedTo != actorId)
                await notifications.SendAsync(
                    task.AssignedTo,
                    "Nội dung công việc đã thay đổi",
                    $"Công việc \"{task.Title}\" vừa được cập nhật nội dung (tên, mô tả, deadline...).",
                    NotificationType.TaskUpdated,
                    relatedEntityType: "Task",
                    relatedEntityId: task.Id);

            return MapToDto(task);
        }

        public async Task<TaskDto> UpdateStatusAsync(int id, UpdateTaskStatusDto dto, string userId)
        {
            var task =
                await db.Tasks
                    .Include(t => t.Assignees)
                    .FirstOrDefaultAsync(t => t.Id == id)
                ?? throw new KeyNotFoundException($"Task {id} not found.");

            await GuardEventNotCompletedAsync(task.EventId);

            var movingToDone = dto.Status == ClubTaskStatus.Done && task.Status != ClubTaskStatus.Done;
            var movingOutOfDone = task.Status == ClubTaskStatus.Done && dto.Status != ClubTaskStatus.Done;

            var isManager = await IsManagerAsync(userId, task.ClubId);

            // A regular member may only move tasks they are assigned to.
            if (!isManager &&
                task.AssignedTo != userId &&
                !task.Assignees.Any(a => a.UserId == userId))
                throw new UnauthorizedAccessException(
                    "Chỉ người được gán công việc mới có thể thay đổi trạng thái.");

            // Only CLUB_ADMIN / DEPT_LEAD may move a task into or out of "Hoàn thành".
            if ((movingToDone || movingOutOfDone) && !isManager)
                throw new UnauthorizedAccessException(
                    "Chỉ Quản lý CLB hoặc Trưởng ban mới được chuyển công việc vào/ra mục Hoàn thành.");

            if (movingToDone)
            {
                // A task must pass review before it can be completed.
                if (task.Status != ClubTaskStatus.Reviewing)
                    throw new InvalidOperationException(
                        "Công việc phải ở trạng thái 'Đang duyệt' và được Quản lý CLB hoặc Trưởng ban duyệt trước khi hoàn thành.");

                // A parent task is only done when every sub-task is done.
                var openSubTasks = await db.Tasks.CountAsync(t =>
                    t.ParentId == id && !t.IsDeleted && t.Status != ClubTaskStatus.Done);
                if (openSubTasks > 0)
                    throw new InvalidOperationException(
                        $"Còn {openSubTasks} công việc con chưa hoàn thành. Hoàn thành toàn bộ công việc con trước.");
            }

            if (dto.Status == ClubTaskStatus.Doing || dto.Status == ClubTaskStatus.Done)
            {
                var blockers = await db
                    .TaskDependencies.Where(td =>
                        td.TaskId == id && td.DependsOnTask.Status != ClubTaskStatus.Done
                    )
                    .Select(td => td.DependsOnTask.Title)
                    .ToListAsync();

                if (blockers.Count > 0)
                    throw new InvalidOperationException(
                        $"Công việc bị chặn bởi: {string.Join(", ", blockers)}. Hoàn thành các công việc phụ thuộc trước."
                    );
            }

            var shouldAwardContribution = dto.Status == ClubTaskStatus.Done && task.CompletedAt == null;
            var shouldReverseContribution = dto.Status != ClubTaskStatus.Done && task.Status == ClubTaskStatus.Done;

            task.Status = dto.Status;
            // A completed task is always 100% done, regardless of the value sent.
            task.Progress = dto.Status == ClubTaskStatus.Done ? 100 : dto.Progress;
            task.KanbanColumnId = dto.KanbanColumnId;

            if (dto.Status == ClubTaskStatus.Done && task.CompletedAt == null)
                task.CompletedAt = DateTimeOffset.UtcNow;
            else if (dto.Status != ClubTaskStatus.Done)
                task.CompletedAt = null;

            try
            {
                if (shouldAwardContribution)
                    await contributionAwardService.AwardTaskCompletionAsync(task);
                else if (shouldReverseContribution)
                    await contributionAwardService.ReverseTaskAsync(task.Id);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Contribution auto-award failed for task {TaskId}.", task.Id);
            }

            await db.SaveChangesAsync();

            // Notify the assignee that their task changed status.
            if (!string.IsNullOrEmpty(task.AssignedTo))
                await notifications.SendAsync(
                    task.AssignedTo,
                    "Trạng thái công việc đã thay đổi",
                    $"Công việc \"{task.Title}\" chuyển sang trạng thái {dto.Status}.",
                    NotificationType.TaskStatusUpdated,
                    relatedEntityType: "Task",
                    relatedEntityId: task.Id);

            return MapToDto(task);
        }

        public async Task DeleteAsync(int id, string userId)
        {
            var task =
                await db.Tasks.FindAsync(id)
                ?? throw new KeyNotFoundException($"Task {id} not found.");

            await RequireManagerRoleAsync(userId, task.ClubId);

            db.Tasks.Remove(task);
            await db.SaveChangesAsync();
        }

        private async Task RequireManagerRoleAsync(string userId, int clubId)
        {
            if (!await IsManagerAsync(userId, clubId))
                throw new UnauthorizedAccessException("Chỉ Trưởng ban hoặc Quản lý CLB mới có quyền xóa công việc.");
        }

        private Task<bool> IsManagerAsync(string userId, int clubId) =>
            db.ClubMemberships
                .AsNoTracking()
                .AnyAsync(m =>
                    m.UserId == userId &&
                    m.ClubId == clubId &&
                    m.Status == MembershipStatus.Active &&
                    (m.ClubRole == ClubRole.DEPT_LEAD || m.ClubRole == ClubRole.CLUB_ADMIN));

        public async Task<List<TaskDependencyDto>> GetDependenciesAsync(int taskId)
        {
            return await db
                .TaskDependencies.AsNoTracking()
                .Where(td => td.TaskId == taskId)
                .Select(td => new TaskDependencyDto
                {
                    DependsOnTaskId = td.DependsOnTaskId,
                    Title = td.DependsOnTask.Title,
                    Status = td.DependsOnTask.Status.ToString(),
                })
                .ToListAsync();
        }

        public async Task AddDependencyAsync(int taskId, AddDependencyDto dto, string userId)
        {
            var task =
                await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == taskId)
                ?? throw new KeyNotFoundException($"Task {taskId} not found.");

            if (!await IsManagerAsync(userId, task.ClubId))
                throw new UnauthorizedAccessException(
                    "Chỉ Quản lý CLB hoặc Trưởng ban mới được thêm công việc phụ thuộc.");

            var depTask =
                await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == dto.DependsOnTaskId)
                ?? throw new KeyNotFoundException($"Task {dto.DependsOnTaskId} not found.");

            if (task.ClubId != depTask.ClubId)
                throw new InvalidOperationException(
                    "Công việc phụ thuộc phải thuộc cùng câu lạc bộ."
                );

            if (taskId == dto.DependsOnTaskId)
                throw new InvalidOperationException("Công việc không thể phụ thuộc vào chính nó.");

            var circularExists = await db.TaskDependencies.AnyAsync(td =>
                td.TaskId == dto.DependsOnTaskId && td.DependsOnTaskId == taskId
            );
            if (circularExists)
                throw new InvalidOperationException(
                    "Phụ thuộc vòng tròn: công việc kia đã phụ thuộc vào công việc này."
                );

            var alreadyExists = await db.TaskDependencies.AnyAsync(td =>
                td.TaskId == taskId && td.DependsOnTaskId == dto.DependsOnTaskId
            );
            if (alreadyExists)
                return;

            db.TaskDependencies.Add(
                new TaskDependency { TaskId = taskId, DependsOnTaskId = dto.DependsOnTaskId }
            );
            await db.SaveChangesAsync();
        }

        public async Task RemoveDependencyAsync(int taskId, int dependsOnTaskId, string userId)
        {
            var task =
                await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == taskId)
                ?? throw new KeyNotFoundException($"Task {taskId} not found.");

            if (!await IsManagerAsync(userId, task.ClubId))
                throw new UnauthorizedAccessException(
                    "Chỉ Quản lý CLB hoặc Trưởng ban mới được gỡ công việc phụ thuộc.");

            var dep =
                await db.TaskDependencies.FirstOrDefaultAsync(td =>
                    td.TaskId == taskId && td.DependsOnTaskId == dependsOnTaskId
                ) ?? throw new KeyNotFoundException("Không tìm thấy phụ thuộc này.");

            db.TaskDependencies.Remove(dep);
            await db.SaveChangesAsync();
        }

        private static TaskDto MapToDto(ClubTask t) =>
            new()
            {
                Id = t.Id,
                ClubId = t.ClubId,
                ParentId = t.ParentId,
                SprintId = t.SprintId,
                EventId = t.EventId,
                EventName = t.Event?.Name,
                DepartmentId = t.DepartmentId,
                KanbanColumnId = t.KanbanColumnId,
                Title = t.Title,
                Description = t.Description,
                Priority = t.Priority,
                StartDate = t.StartDate,
                Deadline = t.Deadline,
                EstimatedHours = t.EstimatedHours,
                ActualHours = t.ActualHours,
                Status = t.Status,
                Progress = t.Progress,
                CompletedAt = t.CompletedAt,
                AssignedTo = t.AssignedTo,
                AssigneeName = t.Assignee?.FullName,
                CreatedBy = t.CreatedBy,
                CreatedAt = t.CreatedAt,
                SubTaskCount = t.SubTasks?.Count ?? 0,
            };
    }
}
