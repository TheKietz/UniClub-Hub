using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class TaskCommentService(UniClubDbContext db, INotificationService notifications) : ITaskCommentService
    {
        public async Task<List<TaskCommentDto>> GetByTaskAsync(int taskId)
        {
            return await db.TaskComments
                .AsNoTracking()
                .Where(c => c.TaskId == taskId)
                .Include(c => c.User)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new TaskCommentDto
                {
                    Id = c.Id,
                    TaskId = c.TaskId,
                    UserId = c.UserId,
                    UserName = c.User.FullName ?? c.User.UserName ?? c.UserId,
                    UserAvatarUrl = c.User.AvatarUrl,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    IsEdited = c.IsEdited,
                })
                .ToListAsync();
        }

        public async Task<TaskCommentDto> AddAsync(int taskId, string userId, CreateTaskCommentDto dto)
        {
            var comment = new TaskComment
            {
                TaskId = taskId,
                UserId = userId,
                Content = dto.Content,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            db.TaskComments.Add(comment);
            await db.SaveChangesAsync();

            await db.Entry(comment).Reference(c => c.User).LoadAsync();

            // Persist a notification for each task assignee (excluding the commenter) so the
            // comment surfaces in their notification bell. Best-effort: the comment is already
            // committed, so a notification failure must not fail the caller.
            try
            {
                var recipients = await db.TaskAssignees.AsNoTracking()
                    .Where(a => a.TaskId == taskId && a.UserId != userId)
                    .Select(a => a.UserId)
                    .Distinct()
                    .ToListAsync();

                if (recipients.Count > 0)
                {
                    var taskTitle = await db.Tasks.AsNoTracking()
                        .Where(t => t.Id == taskId).Select(t => t.Title).FirstOrDefaultAsync();
                    var commenterName = comment.User.FullName ?? comment.User.UserName ?? "Một thành viên";
                    var excerpt = comment.Content.Length > 80 ? comment.Content[..80] + "…" : comment.Content;

                    foreach (var recipientId in recipients)
                    {
                        await notifications.SendAsync(
                            recipientId,
                            "Bình luận mới trên công việc",
                            $"{commenterName} đã bình luận: \"{excerpt}\" trong \"{taskTitle}\".",
                            NotificationType.Task,
                            relatedEntityType: "Task",
                            relatedEntityId: taskId);
                    }
                }
            }
            catch
            {
                // Notification is optional; never block the comment on a delivery failure.
            }

            return new TaskCommentDto
            {
                Id = comment.Id,
                TaskId = comment.TaskId,
                UserId = comment.UserId,
                UserName = comment.User.FullName ?? comment.User.UserName ?? comment.UserId,
                UserAvatarUrl = comment.User.AvatarUrl,
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                IsEdited = false,
            };
        }

        public async Task<TaskCommentDto> UpdateAsync(int commentId, string userId, UpdateTaskCommentDto dto)
        {
            var comment = await db.TaskComments
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == commentId)
                ?? throw new KeyNotFoundException($"Comment {commentId} not found.");

            if (comment.UserId != userId)
                throw new UnauthorizedAccessException("Chỉ tác giả mới được sửa bình luận.");

            comment.Content = dto.Content;
            comment.UpdatedAt = DateTimeOffset.UtcNow;
            comment.IsEdited = true;

            await db.SaveChangesAsync();

            return new TaskCommentDto
            {
                Id = comment.Id,
                TaskId = comment.TaskId,
                UserId = comment.UserId,
                UserName = comment.User.FullName ?? comment.User.UserName ?? comment.UserId,
                UserAvatarUrl = comment.User.AvatarUrl,
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt,
                IsEdited = comment.IsEdited,
            };
        }

        public async Task DeleteAsync(int commentId, string userId)
        {
            var comment = await db.TaskComments.FindAsync(commentId)
                ?? throw new KeyNotFoundException($"Comment {commentId} not found.");

            if (comment.UserId != userId)
                throw new UnauthorizedAccessException("Chỉ tác giả mới được xóa bình luận.");

            db.TaskComments.Remove(comment);
            await db.SaveChangesAsync();
        }
    }
}
