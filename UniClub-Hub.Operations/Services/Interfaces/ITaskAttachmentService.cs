using UniClub_Hub.Operations.DTOs.Task;
using Microsoft.AspNetCore.Http;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface ITaskAttachmentService
    {
        Task<List<TaskAttachmentDto>> GetByTaskAsync(int taskId);
        Task<TaskAttachmentDto> AddLinkAsync(int taskId, string userId, AddTaskAttachmentLinkDto dto);
        Task<TaskAttachmentDto> UploadFileAsync(int taskId, string userId, IFormFile file, string? note);
        Task DeleteAsync(int attachmentId, string userId);
    }
}
