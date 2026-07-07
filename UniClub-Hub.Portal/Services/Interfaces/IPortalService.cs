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

        // Feed tổng hợp toàn trường (public). scope: "all" | "university" | "club".
        Task<PortalPagedResult<PortalEventDto>> GetEventsFeedAsync(
            string? scope, int? clubId, string? status, string? search, int page, int pageSize);

        Task<PortalPagedResult<PortalNewsDto>> GetNewsFeedAsync(
            string? scope, int? clubId, string? category, string? search, int page, int pageSize);
    }
}
