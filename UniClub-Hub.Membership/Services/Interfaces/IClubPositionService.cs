using UniClub_Hub.Membership.DTOs.Position;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IClubPositionService
    {
        Task<IReadOnlyList<ClubPositionDto>> GetAllAsync(
            int clubId,
            string requesterUserId,
            bool isSuperAdmin,
            int? departmentId = null
        );

        Task<ClubPositionDto> GetByIdAsync(
            int clubId,
            int positionId,
            string requesterUserId,
            bool isSuperAdmin
        );

        Task<ClubPositionDto> CreateAsync(
            int clubId,
            CreateClubPositionDto dto,
            string requesterUserId,
            bool isSuperAdmin
        );

        Task<ClubPositionDto> UpdateAsync(
            int clubId,
            int positionId,
            UpdateClubPositionDto dto,
            string requesterUserId,
            bool isSuperAdmin
        );

        Task DeleteAsync(int clubId, int positionId, string requesterUserId, bool isSuperAdmin);

        Task<ClubPositionDto> SetPermissionsAsync(
            int clubId,
            int positionId,
            UpdateClubPositionPermissionsDto dto,
            string requesterUserId,
            bool isSuperAdmin
        );

        Task<MemberPositionsDto> GetMemberPositionsAsync(
            int clubId,
            int membershipId,
            string requesterUserId,
            bool isSuperAdmin
        );

        Task<MemberPositionsDto> AssignMemberPositionsAsync(
            int clubId,
            int membershipId,
            AssignMemberPositionsDto dto,
            string requesterUserId,
            bool isSuperAdmin
        );
    }
}
