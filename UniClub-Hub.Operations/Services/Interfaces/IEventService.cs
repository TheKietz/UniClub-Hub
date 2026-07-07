using Microsoft.AspNetCore.Http;
using UniClub_Hub.Operations.DTOs.Event;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface IEventService
    {
        Task<PagedResult<EventDto>> GetAllAsync(int? clubId, string? status, string? search, int page, int pageSize);
        Task<EventDto> GetByIdAsync(int id);
        Task<EventDto> CreateAsync(int? clubId, CreateEventDto dto, string actorId);
        Task<EventDto> UpdateAsync(int id, UpdateEventDto dto, string actorId);
        Task DeleteAsync(int id, string actorId);

        // Sessions
        Task<List<EventSessionDto>> GetSessionsAsync(int eventId);
        Task<EventSessionDto> AddSessionAsync(int eventId, CreateEventSessionDto dto, string actorId);
        Task DeleteSessionAsync(int eventId, int sessionId, string actorId);
        Task ReorderSessionsAsync(int eventId, List<int> orderedIds, string actorId);

        // Staff
        Task<List<EventStaffDto>> GetStaffAsync(int eventId);
        Task<EventStaffDto> AssignStaffAsync(int eventId, AssignEventStaffDto dto, string actorId);
        Task RemoveStaffAsync(int eventId, string userId, string actorId);

        // Registrations
        Task<List<EventRegistrationDto>> GetRegistrationsAsync(int eventId);
        Task<EventRegistrationDto> RegisterMemberAsync(int eventId, RegisterMemberDto dto, string actorId);
        Task RemoveRegistrationAsync(int eventId, string userId, string actorId);
        Task UpdateAttendanceAsync(int eventId, string userId, UpdateAttendanceDto dto, string actorId);

        // Self-service registration (any authenticated user, no manager role required)
        Task<EventRegistrationDto> RegisterSelfAsync(int eventId, string userId);
        Task<EventRegistrationDto?> GetMyRegistrationAsync(int eventId, string userId);
        Task UnregisterSelfAsync(int eventId, string userId);

        // Attachments
        Task<List<EventAttachmentDto>> GetAttachmentsAsync(int eventId);
        Task<EventAttachmentDto> UploadAttachmentAsync(int eventId, IFormFile file, string? note, string actorId);
        Task DeleteAttachmentAsync(int eventId, int attachmentId, string actorId);

        // Registration Link
        Task<string?> GetRegistrationLinkAsync(int eventId);
        Task UpsertRegistrationLinkAsync(int eventId, string? url, string actorId);
    }
}
