using UniClub_Hub.Operations.DTOs.Sprint;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface ISprintService
    {
        Task<PagedResult<SprintDto>> GetByClubAsync(int clubId, int? departmentId, int? eventId, int page, int pageSize);
        Task<SprintDto> GetByIdAsync(int id);
        Task<SprintDto> CreateAsync(int clubId, CreateSprintDto dto, string userId);
        Task<SprintDto> UpdateAsync(int id, UpdateSprintDto dto, string userId);
        Task DeleteAsync(int id, string userId);
    }
}
