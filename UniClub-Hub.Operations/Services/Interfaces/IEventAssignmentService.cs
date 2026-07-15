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
        Task<AssignmentDto> UpdateAsync(int id, string title, string? description, TaskPriority priority, DateTimeOffset? deadline, int clubId);
        Task<AssignmentDto> AddAttachmentsAsync(int id, IFormFileCollection files);
        Task<AssignmentDto> RemoveAttachmentAsync(int id, string url);
        Task<AssignmentDto> UpdateStatusAsync(int id, string status);
        /// <summary>Soft-cancel: marks the assignment "Cancelled" (kept for the club's inbox history).</summary>
        Task<AssignmentDto> CancelAsync(int id);
        /// <summary>Club admin removes a cancelled slip from the inbox; its tasks are soft-deleted.</summary>
        Task<AssignmentDto> RemoveCancelledAsync(int id, string userId);
    }
}
