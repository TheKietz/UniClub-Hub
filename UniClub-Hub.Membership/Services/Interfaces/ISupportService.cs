using UniClub_Hub.Membership.DTOs.Support;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface ISupportService
    {
        Task<SupportTicketDto> CreateAsync(string userId, CreateSupportTicketDto dto);
        Task<IEnumerable<SupportTicketDto>> GetMyTicketsAsync(string userId);
        Task<IEnumerable<SupportTicketDto>> GetAllAsync(string? status = null);
        Task<SupportTicketDto> UpdateStatusAsync(int ticketId, UpdateTicketStatusDto dto);
    }
}
