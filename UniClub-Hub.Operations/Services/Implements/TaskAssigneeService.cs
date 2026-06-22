using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class TaskAssigneeService(UniClubDbContext db) : ITaskAssigneeService
    {
        public async Task<List<TaskAssigneeDto>> GetAsync(int taskId)
        {
            return await db.TaskAssignees
                .AsNoTracking()
                .Where(a => a.TaskId == taskId)
                .Include(a => a.User)
                .Select(a => new TaskAssigneeDto
                {
                    Id = a.Id,
                    TaskId = a.TaskId,
                    UserId = a.UserId,
                    FullName = a.User!.FullName,
                    Email = a.User!.Email,
                    AvatarUrl = a.User!.AvatarUrl,
                    AssignedAt = a.AssignedAt,
                    AssignedBy = a.AssignedBy,
                })
                .ToListAsync();
        }

        public async Task<TaskAssigneeDto> AssignAsync(int taskId, string userId, string assignedBy)
        {
            var existing = await db.TaskAssignees
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.TaskId == taskId && a.UserId == userId);

            if (existing != null)
            {
                var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                return new TaskAssigneeDto
                {
                    Id = existing.Id,
                    TaskId = existing.TaskId,
                    UserId = existing.UserId,
                    FullName = user?.FullName,
                    Email = user?.Email,
                    AvatarUrl = user?.AvatarUrl,
                    AssignedAt = existing.AssignedAt,
                    AssignedBy = existing.AssignedBy,
                };
            }

            var assignee = new TaskAssignee
            {
                TaskId = taskId,
                UserId = userId,
                AssignedAt = DateTime.UtcNow,
                AssignedBy = assignedBy,
            };
            db.TaskAssignees.Add(assignee);
            await db.SaveChangesAsync();

            return await db.TaskAssignees
                .AsNoTracking()
                .Include(a => a.User)
                .Where(a => a.Id == assignee.Id)
                .Select(a => new TaskAssigneeDto
                {
                    Id = a.Id,
                    TaskId = a.TaskId,
                    UserId = a.UserId,
                    FullName = a.User!.FullName,
                    Email = a.User!.Email,
                    AvatarUrl = a.User!.AvatarUrl,
                    AssignedAt = a.AssignedAt,
                    AssignedBy = a.AssignedBy,
                })
                .FirstAsync();
        }

        public async Task UnassignAsync(int taskId, string userId)
        {
            var assignee = await db.TaskAssignees
                .FirstOrDefaultAsync(a => a.TaskId == taskId && a.UserId == userId);
            if (assignee == null) return;
            db.TaskAssignees.Remove(assignee);
            await db.SaveChangesAsync();
        }
    }
}
