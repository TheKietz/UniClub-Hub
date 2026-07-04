using UniClub_Hub.Shared.Common;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.DTOs.Common;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IClubMembershipService
    {
        // Public
        Task<IEnumerable<MemberDto>> GetAllAsync(int clubId, string? status = null, int? departmentId = null);
        Task<PagedResult<MemberDto>> GetPageAsync(int clubId, MemberListQuery query);
        Task<MemberDto> GetByIdAsync(int clubId, int membershipId);

        // CLUB_ADMIN (kiểm tra quyền theo CLB)
        Task<MemberDto> AddMemberAsync(int clubId, AddMemberDto dto, string requestUserId);
        Task<MemberDto> UpdateMemberAsync(int clubId, int membershipId, UpdateMemberDto dto, string requestUserId);
        Task RemoveMemberAsync(int clubId, int membershipId, string requestUserId);

        // SUPER_ADMIN (bypass kiểm tra quyền, force = bỏ qua guard trưởng CLB duy nhất)
        Task<MemberDto> AddMemberAsAdminAsync(int clubId, AddMemberDto dto);
        Task<MemberDto> UpdateMemberAsAdminAsync(int clubId, int membershipId, UpdateMemberDto dto, bool force = false);
        Task RemoveMemberAsAdminAsync(int clubId, int membershipId, bool force = false);

        // Xác nhận chính thức (Probation → Active)
        Task<MemberDto> PromoteMemberAsync(int clubId, int membershipId, string requesterUserId, bool isSuperAdmin);

        // Thành viên tự rời CLB
        Task ResignAsync(int clubId, string userId);

        // Bổ nhiệm Trưởng CLB (dùng bởi ClubService khi tạo CLB mới)
        Task<MemberDto> AssignClubAdminAsync(int clubId, string userId);

        /// <summary>Kiểm tra CLB chưa vượt giới hạn thành viên Active/Probation.</summary>
        Task EnsureMemberCapacityAsync(int clubId);

        // Custom member fields
        Task<List<MemberFieldDef>> GetMemberFieldSchemaAsync(int clubId);
        Task<List<MemberFieldDef>> UpdateMemberFieldSchemaAsync(int clubId, List<MemberFieldDef> fields, string requestUserId, bool isSuperAdmin);
        Task<MemberDto> UpdateMemberCustomDataAsync(int clubId, int membershipId, Dictionary<string, string?> data, string requestUserId, bool isSuperAdmin);
    }
}
