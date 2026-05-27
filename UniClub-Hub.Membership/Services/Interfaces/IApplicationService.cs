using UniClub_Hub.Shared.Common;
using UniClub_Hub.Membership.DTOs.Application;
using UniClub_Hub.Membership.DTOs.Pipeline;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IApplicationService
    {
        Task<IEnumerable<ApplicationDto>> GetMyApplicationsAsync(string userId);
        Task<IEnumerable<AdminApplicationDto>> GetAllByClubAsync(int clubId, string? status = null);
        Task<ApplicationDto> SubmitAsync(int clubId, string userId, SubmitApplicationDto dto);
        Task<AdminApplicationDto> ReviewAsync(int clubId, int applicationId, ReviewApplicationDto dto, string reviewerId, bool isSuperAdmin);
        Task<AdminApplicationDto> AdvanceStageAsync(int clubId, int applicationId, AdvanceApplicationRequest req, string reviewerId, bool isSuperAdmin);
    }
}
