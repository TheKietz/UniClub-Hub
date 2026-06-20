using UniClub_Hub.Membership.DTOs.User;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IUserService
    {
        Task<PagedResult<UserListItemDto>> GetUsersAsync(string? search, int page, int pageSize);
        Task<PagedResult<UserListItemDto>> GetUsersAsync(UserListQuery query);
        Task<UserDetailDto?> GetUserByIdAsync(string userId);
        Task LockUserAsync(string userId);
        Task UnlockUserAsync(string userId);
        Task SoftDeleteUserAsync(string userId, string adminId);
        Task<UserDetailDto?> GetMeAsync(string userId);
        Task UpdateMeAsync(string userId, UpdateProfileDto dto);
        Task<UserDetailDto> CreateUserAsync(CreateUserDto dto);
        Task ChangeRoleAsync(string userId, string newRole);
        Task<IEnumerable<MembershipHistoryDto>> GetMyHistoryAsync(string userId);
    }
}
