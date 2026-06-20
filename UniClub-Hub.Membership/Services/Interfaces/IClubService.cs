using UniClub_Hub.Shared.Common;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Membership.DTOs.Common;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IClubService
    {
        // Public
        Task<IEnumerable<ClubDto>> GetAllAsync(int? categoryId = null, string? status = null);
        Task<ClubDto> GetByIdAsync(int id);

        // Admin
        Task<IEnumerable<AdminClubDto>> GetAllAdminAsync(int? categoryId = null, string? status = null);
        Task<PagedResult<AdminClubDto>> GetAllAdminPageAsync(AdminClubListQuery query);
        Task<AdminClubDto> GetByIdAdminAsync(int id);
        Task<AdminClubDto> CreateAsync(CreateClubDto dto);
        Task<AdminClubDto> UpdateAsync(int id, UpdateClubDto dto);
        Task DeleteAsync(int id);
    }
}
