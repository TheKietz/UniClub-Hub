using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface ITaskService
    {
        Task<PagedResult<TaskDto>> GetByClubAsync(int? clubId, string? status, int? sprintId, int? eventId, string? assignedTo, int? parentId, int? departmentId, int page, int pageSize, bool? unassigned = null);
        Task<TaskDto> GetByIdAsync(int id);
        Task<TaskDto> CreateAsync(int clubId, CreateTaskDto dto, string createdBy);
        Task<TaskDto> UpdateAsync(int id, UpdateTaskDto dto, string? actorId = null);
        Task<TaskDto> UpdateStatusAsync(int id, UpdateTaskStatusDto dto, string userId);
        Task DeleteAsync(int id, string userId);
        Task<List<TaskDependencyDto>> GetDependenciesAsync(int taskId);
        Task AddDependencyAsync(int taskId, AddDependencyDto dto, string userId);
        Task RemoveDependencyAsync(int taskId, int dependsOnTaskId, string userId);
    }
}
