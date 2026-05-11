using UniClub_Hub.Shared.Common;
using UniClub_Hub.Membership.DTOs.Application;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IApplicationService
    {
        Task<IEnumerable<ApplicationDto>> GetMyApplicationsAsync(string userId);
        Task<IEnumerable<AdminApplicationDto>> GetAllByClubAsync(int clubId, string? status = null);
        Task<ApplicationDto> SubmitAsync(int clubId, string userId, SubmitApplicationDto dto);
        Task<AdminApplicationDto> ReviewAsync(int clubId, int applicationId, ReviewApplicationDto dto, string reviewerId, bool isSuperAdmin);
    }
}
