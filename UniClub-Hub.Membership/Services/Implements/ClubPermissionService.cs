using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Permission;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ClubPermissionService : IClubPermissionService
    {
        private readonly UniClubDbContext _db;

        public ClubPermissionService(UniClubDbContext db)
        {
            _db = db;
        }

        public async Task<ClubEffectivePermissionsDto> GetEffectivePermissionsAsync(
            int clubId,
            string userId,
            bool isSuperAdmin
        )
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
            {
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");
            }

            if (isSuperAdmin)
            {
                return new ClubEffectivePermissionsDto
                {
                    ClubId = clubId,
                    IsSuperAdmin = true,
                    IsClubAdmin = true,
                    PermissionCodes = ClubPermissions.All.Select(p => p.Code).OrderBy(p => p).ToList(),
                };
            }

            var memberships = await _db.ClubMemberships
                .AsNoTracking()
                .Where(m =>
                    m.ClubId == clubId &&
                    m.UserId == userId &&
                    (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                .Select(m => new { m.Id, m.ClubRole, m.Status })
                .ToListAsync();

            if (memberships.Count == 0)
            {
                throw new UnauthorizedAccessException();
            }

            var isClubAdmin = memberships.Any(m =>
                m.ClubRole == ClubRole.CLUB_ADMIN &&
                m.Status == MembershipStatus.Active);

            if (isClubAdmin)
            {
                return new ClubEffectivePermissionsDto
                {
                    ClubId = clubId,
                    IsClubAdmin = true,
                    PermissionCodes = ClubPermissions.All.Select(p => p.Code).OrderBy(p => p).ToList(),
                };
            }

            var membershipIds = memberships.Select(m => m.Id).ToList();
            var permissionCodes = await _db.ClubMemberPositions
                .AsNoTracking()
                .Where(mp => membershipIds.Contains(mp.MembershipId))
                .SelectMany(mp => mp.Position.Permissions!.Select(p => p.PermissionCode))
                .Distinct()
                .OrderBy(code => code)
                .ToListAsync();

            return new ClubEffectivePermissionsDto
            {
                ClubId = clubId,
                PermissionCodes = permissionCodes,
            };
        }

        public async Task<bool> HasPermissionAsync(
            int clubId,
            string userId,
            bool isSuperAdmin,
            string permissionCode
        )
        {
            if (!ClubPermissions.IsKnown(permissionCode))
            {
                return false;
            }

            try
            {
                var permissions = await GetEffectivePermissionsAsync(clubId, userId, isSuperAdmin);
                return permissions.PermissionCodes.Contains(permissionCode, StringComparer.OrdinalIgnoreCase);
            }
            catch (UnauthorizedAccessException)
            {
                return false;
            }
        }

        public async Task<bool> HasAnyPermissionAsync(
            int clubId,
            string userId,
            bool isSuperAdmin,
            params string[] permissionCodes
        )
        {
            var knownCodes = permissionCodes
                .Where(ClubPermissions.IsKnown)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (knownCodes.Count == 0)
            {
                return false;
            }

            try
            {
                var permissions = await GetEffectivePermissionsAsync(clubId, userId, isSuperAdmin);
                return permissions.PermissionCodes.Any(knownCodes.Contains);
            }
            catch (UnauthorizedAccessException)
            {
                return false;
            }
        }

        public async Task EnsureHasPermissionAsync(
            int clubId,
            string userId,
            bool isSuperAdmin,
            string permissionCode
        )
        {
            if (!await HasPermissionAsync(clubId, userId, isSuperAdmin, permissionCode))
            {
                throw new UnauthorizedAccessException();
            }
        }

        public async Task EnsureHasAnyPermissionAsync(
            int clubId,
            string userId,
            bool isSuperAdmin,
            params string[] permissionCodes
        )
        {
            if (!await HasAnyPermissionAsync(clubId, userId, isSuperAdmin, permissionCodes))
            {
                throw new UnauthorizedAccessException();
            }
        }
    }
}
