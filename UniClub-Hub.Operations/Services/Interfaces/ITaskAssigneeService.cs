using UniClub_Hub.Operations.DTOs.Task;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface ITaskAssigneeService
    {
        Task<List<TaskAssigneeDto>> GetAsync(int taskId);
        Task<TaskAssigneeDto> AssignAsync(int taskId, string userId, string assignedBy);
        Task UnassignAsync(int taskId, string userId, string actorId);
    }
}
