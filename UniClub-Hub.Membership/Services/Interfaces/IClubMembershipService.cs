using UniClub_Hub.Shared.Common;
using UniClub_Hub.Membership.DTOs.Membership;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IClubMembershipService
    {
        // Public
        Task<IEnumerable<MemberDto>> GetAllAsync(int clubId, string? status = null);
        Task<MemberDto> GetByIdAsync(int clubId, int membershipId);

        // CLUB_ADMIN (kiểm tra quyền theo CLB)
        Task<MemberDto> AddMemberAsync(int clubId, AddMemberDto dto, string requestUserId);
        Task<MemberDto> UpdateMemberAsync(int clubId, int membershipId, UpdateMemberDto dto, string requestUserId);
        Task RemoveMemberAsync(int clubId, int membershipId, string requestUserId);

        // SUPER_ADMIN (bypass kiểm tra quyền)
        Task<MemberDto> AddMemberAsAdminAsync(int clubId, AddMemberDto dto);
        Task<MemberDto> UpdateMemberAsAdminAsync(int clubId, int membershipId, UpdateMemberDto dto);
        Task RemoveMemberAsAdminAsync(int clubId, int membershipId);

        // Xác nhận chính thức (Probation → Active)
        Task<MemberDto> PromoteMemberAsync(int clubId, int membershipId);
    }
}
