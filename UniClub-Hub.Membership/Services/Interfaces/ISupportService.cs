using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.DTOs.Support;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface ISupportService
    {
        Task<SupportTicketDto> CreateAsync(string userId, CreateSupportTicketDto dto);
        Task<IEnumerable<SupportTicketDto>> GetMyTicketsAsync(string userId);
        Task<PagedResult<SupportTicketDto>> GetAllAsync(SupportListQuery request);
        Task<SupportTicketDto> UpdateStatusAsync(int ticketId, UpdateTicketStatusDto dto);
    }
}
