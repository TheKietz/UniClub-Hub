using UniClub_Hub.Membership.DTOs.Permission;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IClubPermissionService
    {
        Task<ClubEffectivePermissionsDto> GetEffectivePermissionsAsync(
            int clubId,
            string userId,
            bool isSuperAdmin
        );

        Task<bool> HasPermissionAsync(
            int clubId,
            string userId,
            bool isSuperAdmin,
            string permissionCode
        );

        Task<bool> HasAnyPermissionAsync(
            int clubId,
            string userId,
            bool isSuperAdmin,
            params string[] permissionCodes
        );

        Task EnsureHasPermissionAsync(
            int clubId,
            string userId,
            bool isSuperAdmin,
            string permissionCode
        );

        Task EnsureHasAnyPermissionAsync(
            int clubId,
            string userId,
            bool isSuperAdmin,
            params string[] permissionCodes
        );
    }
}
