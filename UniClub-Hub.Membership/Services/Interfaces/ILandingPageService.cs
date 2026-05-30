using Microsoft.AspNetCore.Http;
using UniClub_Hub.Membership.DTOs.LandingPage;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface ILandingPageService
    {
        Task<LandingPageResponse> GetAsync(int clubId);
        Task<LandingPageResponse> UpsertAsync(int clubId, UpsertLandingPageRequest dto);
        Task<string?> UploadHeroAsync(int clubId, IFormFile file);
    }
}
