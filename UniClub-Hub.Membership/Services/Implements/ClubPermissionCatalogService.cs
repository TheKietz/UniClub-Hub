using UniClub_Hub.Membership.DTOs.Permission;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ClubPermissionCatalogService : IClubPermissionCatalogService
    {
        public IReadOnlyList<ClubPermissionDto> GetAll()
        {
            return ClubPermissions.All
                .Select(permission => new ClubPermissionDto
                {
                    Code = permission.Code,
                    Name = permission.Name,
                    Description = permission.Description,
                    Group = permission.Group,
                    Module = permission.Module
                })
                .ToList();
        }

        public bool IsKnown(string code)
        {
            return ClubPermissions.IsKnown(code);
        }
    }
}
