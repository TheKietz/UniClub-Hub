using UniClub_Hub.Operations.DTOs.Event;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface IEventService
    {
        Task<PagedResult<EventDto>> GetAllAsync(int clubId, string? status, int page, int pageSize);
        Task<EventDto> GetByIdAsync(int id);
        Task<EventDto> CreateAsync(int clubId, CreateEventDto dto, string createdBy);
        Task<EventDto> UpdateAsync(int id, UpdateEventDto dto);
        Task DeleteAsync(int id);

        // Sessions
        Task<List<EventSessionDto>> GetSessionsAsync(int eventId);
        Task<EventSessionDto> AddSessionAsync(int eventId, CreateEventSessionDto dto);
        Task DeleteSessionAsync(int eventId, int sessionId);
        Task ReorderSessionsAsync(int eventId, List<int> orderedIds);

        // Staff
        Task<List<EventStaffDto>> GetStaffAsync(int eventId);
        Task<EventStaffDto> AssignStaffAsync(int eventId, AssignEventStaffDto dto);
        Task RemoveStaffAsync(int eventId, string userId);
    }
}
