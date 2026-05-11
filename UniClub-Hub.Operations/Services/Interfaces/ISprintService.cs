using UniClub_Hub.Operations.DTOs.Sprint;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface ISprintService
    {
        Task<PagedResult<SprintDto>> GetByClubAsync(int clubId, int? eventId, int page, int pageSize);
        Task<SprintDto> GetByIdAsync(int id);
        Task<SprintDto> CreateAsync(int clubId, CreateSprintDto dto, string createdBy);
        Task<SprintDto> UpdateAsync(int id, UpdateSprintDto dto);
        Task DeleteAsync(int id);
    }
}
