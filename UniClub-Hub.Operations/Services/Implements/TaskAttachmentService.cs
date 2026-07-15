using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class TaskAttachmentService(UniClubDbContext db, IFileStorageService fileStorageService) : ITaskAttachmentService
    {
        public async Task<List<TaskAttachmentDto>> GetByTaskAsync(int taskId)
        {
            return await db.TaskAttachments
                .AsNoTracking()
                .Where(a => a.TaskId == taskId && !a.IsDeleted)
                .OrderByDescending(a => a.UploadedAt)
                .Select(a => new TaskAttachmentDto
                {
                    Id = a.Id,
                    TaskId = a.TaskId,
                    FileUrl = a.FileUrl,
                    FileName = a.FileName,
                    ContentType = a.ContentType,
                    FileSize = a.FileSize,
                    Note = a.Note,
                    IsLink = a.ContentType == "link",
                    UploadedAt = a.UploadedAt,
                    UserId = a.UserId,
                })
                .ToListAsync();
        }

        public async Task<TaskAttachmentDto> AddLinkAsync(int taskId, string userId, AddTaskAttachmentLinkDto dto)
        {
            var attachment = new TaskAttachment
            {
                TaskId = taskId,
                UserId = userId,
                FileUrl = dto.FileUrl,
                FileName = dto.Note ?? dto.FileUrl,
                ContentType = "link",
                Note = dto.Note,
                UploadedAt = DateTimeOffset.UtcNow,
            };

            db.TaskAttachments.Add(attachment);
            await db.SaveChangesAsync();

            return MapToDto(attachment);
        }

        public async Task<TaskAttachmentDto> UploadFileAsync(int taskId, string userId, IFormFile file, string? note)
        {
            var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == taskId)
                ?? throw new KeyNotFoundException($"Task {taskId} not found.");

            // Any active club member may attach files (members explicitly have this right).
            var isActiveMember = await db.ClubMemberships.AnyAsync(m =>
                m.UserId == userId &&
                m.ClubId == task.ClubId &&
                m.Status == MembershipStatus.Active);

            if (!isActiveMember)
                throw new UnauthorizedAccessException("Chỉ thành viên CLB mới được tải lên tệp đính kèm.");

            var count = await db.TaskAttachments.CountAsync(a => a.TaskId == taskId && !a.IsDeleted);
            if (count >= 5)
                throw new InvalidOperationException("Công việc đã đạt giới hạn 5 tệp đính kèm.");

            var url = await fileStorageService.UploadAsync(file, "uploads/tasks");
            if (url == null) throw new InvalidOperationException("Không thể tải file lên.");

            var attachment = new TaskAttachment
            {
                TaskId = taskId,
                UserId = userId,
                FileUrl = url,
                FileName = file.FileName,
                ContentType = file.ContentType,
                FileSize = file.Length,
                Note = note,
                UploadedAt = DateTimeOffset.UtcNow,
            };

            db.TaskAttachments.Add(attachment);
            await db.SaveChangesAsync();

            return MapToDto(attachment);
        }

        public async Task DeleteAsync(int attachmentId, string userId)
        {
            var attachment = await db.TaskAttachments
                .Include(a => a.Task)
                .FirstOrDefaultAsync(a => a.Id == attachmentId)
                ?? throw new KeyNotFoundException($"Attachment {attachmentId} not found.");

            if (attachment.UserId != userId)
            {
                var isClubAdmin = await db.ClubMemberships.AnyAsync(m =>
                    m.UserId == userId &&
                    m.ClubId == attachment.Task.ClubId &&
                    m.Status == MembershipStatus.Active &&
                    m.ClubRole == ClubRole.CLUB_ADMIN);

                if (!isClubAdmin)
                    throw new UnauthorizedAccessException("Chỉ người upload hoặc Admin CLB mới được xóa đính kèm.");
            }

            db.TaskAttachments.Remove(attachment);
            await db.SaveChangesAsync();
        }

        private static TaskAttachmentDto MapToDto(TaskAttachment a) => new()
        {
            Id = a.Id,
            TaskId = a.TaskId,
            FileUrl = a.FileUrl,
            FileName = a.FileName,
            ContentType = a.ContentType,
            FileSize = a.FileSize,
            Note = a.Note,
            IsLink = a.ContentType == "link",
            UploadedAt = a.UploadedAt,
            UserId = a.UserId,
        };
    }
}
