using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class TaskService(UniClubDbContext db) : ITaskService
    {
        public async Task<PagedResult<TaskDto>> GetByClubAsync(
            int clubId,
            string? status,
            int? sprintId,
            int? eventId,
            string? assignedTo,
            int? parentId,
            int page,
            int pageSize
        )
        {
            var query = db.Tasks.AsNoTracking().Where(t => t.ClubId == clubId);

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
                    DepartmentId = t.DepartmentId,
                    Title = t.Title,
                    Description = t.Description,
                    Priority = t.Priority,
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
                    SubTaskCount = t.SubTasks != null ? t.SubTasks.Count : 0,
                    BlockingCount = db.TaskDependencies.Count(td =>
                        td.TaskId == t.Id && td.DependsOnTask.Status != ClubTaskStatus.Done
                    ),
                    IsBlocked = db.TaskDependencies.Any(td =>
                        td.TaskId == t.Id && td.DependsOnTask.Status != ClubTaskStatus.Done
                    ),
                })
                .ToListAsync();

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

        public async Task<TaskDto> CreateAsync(int clubId, CreateTaskDto dto, string createdBy)
        {
            var task = new ClubTask
            {
                ClubId = clubId,
                Title = dto.Title,
                Description = dto.Description,
                Priority = dto.Priority,
                Deadline = dto.Deadline?.ToUniversalTime(),
                EstimatedHours = dto.EstimatedHours,
                AssignedTo = dto.AssignedTo,
                EventId = dto.EventId,
                SprintId = dto.SprintId,
                DepartmentId = dto.DepartmentId,
                ParentId = dto.ParentId,
                Status = ClubTaskStatus.Todo,
                CreatedBy = createdBy,
            };

            db.Tasks.Add(task);
            await db.SaveChangesAsync();
            return MapToDto(task);
        }

        public async Task<TaskDto> UpdateAsync(int id, UpdateTaskDto dto)
        {
            var task =
                await db.Tasks.FindAsync(id)
                ?? throw new KeyNotFoundException($"Task {id} not found.");

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.Priority = dto.Priority;
            task.Deadline = dto.Deadline;
            task.EstimatedHours = dto.EstimatedHours;
            task.ActualHours = dto.ActualHours;
            task.AssignedTo = dto.AssignedTo;
            task.EventId = dto.EventId;
            task.SprintId = dto.SprintId;
            task.DepartmentId = dto.DepartmentId;

            await db.SaveChangesAsync();
            return MapToDto(task);
        }

        public async Task<TaskDto> UpdateStatusAsync(int id, UpdateTaskStatusDto dto)
        {
            var task =
                await db.Tasks.FindAsync(id)
                ?? throw new KeyNotFoundException($"Task {id} not found.");

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

            task.Status = dto.Status;
            task.Progress = dto.Progress;

            if (dto.Status == ClubTaskStatus.Done && task.CompletedAt == null)
                task.CompletedAt = DateTimeOffset.UtcNow;
            else if (dto.Status != ClubTaskStatus.Done)
                task.CompletedAt = null;

            await db.SaveChangesAsync();
            return MapToDto(task);
        }

        public async Task DeleteAsync(int id)
        {
            var task =
                await db.Tasks.FindAsync(id)
                ?? throw new KeyNotFoundException($"Task {id} not found.");

            db.Tasks.Remove(task);
            await db.SaveChangesAsync();
        }

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

        public async Task AddDependencyAsync(int taskId, AddDependencyDto dto)
        {
            var task =
                await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == taskId)
                ?? throw new KeyNotFoundException($"Task {taskId} not found.");

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

        public async Task RemoveDependencyAsync(int taskId, int dependsOnTaskId)
        {
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
                DepartmentId = t.DepartmentId,
                Title = t.Title,
                Description = t.Description,
                Priority = t.Priority,
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
