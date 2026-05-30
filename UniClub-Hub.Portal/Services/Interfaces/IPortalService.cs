using UniClub_Hub.Portal.DTOs;

namespace UniClub_Hub.Portal.Services.Interfaces
{
    public interface IPortalService
    {
        Task<ExplorePagedResult> GetExploreClubsAsync(
            string? search,
            int? categoryId,
            int page,
            int pageSize);

        Task<ClubLandingDataDto> GetClubLandingPageAsync(int clubId);
    }
}
