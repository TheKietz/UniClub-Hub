using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class TaskCommentService(UniClubDbContext db) : ITaskCommentService
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
