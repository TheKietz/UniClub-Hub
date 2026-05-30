using UniClub_Hub.Membership.DTOs.Permission;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IClubPermissionCatalogService
    {
        IReadOnlyList<ClubPermissionDto> GetAll();
        bool IsKnown(string code);
    }
}
