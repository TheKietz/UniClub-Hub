using UniClub_Hub.Operations.DTOs.Task;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface ITaskCommentService
    {
        Task<List<TaskCommentDto>> GetByTaskAsync(int taskId);
        Task<TaskCommentDto> AddAsync(int taskId, string userId, CreateTaskCommentDto dto);
        Task<TaskCommentDto> UpdateAsync(int commentId, string userId, UpdateTaskCommentDto dto);
        Task DeleteAsync(int commentId, string userId);
    }
}
