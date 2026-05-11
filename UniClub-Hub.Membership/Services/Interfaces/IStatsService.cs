using UniClub_Hub.Shared.Common;
using UniClub_Hub.Membership.DTOs.Stats;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IStatsService
    {
        Task<SystemStatsDto> GetSystemStatsAsync();
        Task<ClubStatsDto?> GetClubStatsAsync(int clubId);
    }
}
