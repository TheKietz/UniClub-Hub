using Microsoft.AspNetCore.Http;
using UniClub_Hub.Operations.DTOs.Assignment;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface IEventAssignmentService
    {
        Task<List<AssignmentDto>> GetByEventAsync(int eventId);
        Task<List<AssignmentDto>> GetByClubAsync(int clubId);
        Task<AssignmentDto> CreateAsync(
            int eventId, int clubId,
            string title, string? description,
            TaskPriority priority, DateTimeOffset? deadline,
            string actorId, IFormFileCollection? files);
        Task<AssignmentDto> UpdateStatusAsync(int id, string status);
        Task DeleteAsync(int id);
    }
}
