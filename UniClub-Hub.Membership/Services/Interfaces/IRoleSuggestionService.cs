using UniClub_Hub.Membership.DTOs.Ai;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IRoleSuggestionService
    {
        Task<RoleSuggestionDto> SuggestRoleForMemberAsync(
            int clubId,
            int membershipId,
            string requesterUserId,
            bool isSuperAdmin,
            CancellationToken cancellationToken = default
        );
    }
}
