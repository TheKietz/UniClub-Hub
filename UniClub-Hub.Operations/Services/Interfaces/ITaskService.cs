using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface ITaskService
    {
        Task<PagedResult<TaskDto>> GetByClubAsync(int clubId, string? status, int? sprintId, int? eventId, string? assignedTo, int? parentId, int page, int pageSize);
        Task<TaskDto> GetByIdAsync(int id);
        Task<TaskDto> CreateAsync(int clubId, CreateTaskDto dto, string createdBy);
        Task<TaskDto> UpdateAsync(int id, UpdateTaskDto dto);
        Task<TaskDto> UpdateStatusAsync(int id, UpdateTaskStatusDto dto);
        Task DeleteAsync(int id);
        Task<List<TaskDependencyDto>> GetDependenciesAsync(int taskId);
        Task AddDependencyAsync(int taskId, AddDependencyDto dto);
        Task RemoveDependencyAsync(int taskId, int dependsOnTaskId);
    }
}
