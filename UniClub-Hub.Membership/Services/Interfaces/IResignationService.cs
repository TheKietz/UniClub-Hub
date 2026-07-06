using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.DTOs.Resignation;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IResignationService
    {
        // Thành viên gửi đơn từ chức
        Task<ResignationRequestDto> SubmitAsync(int clubId, string userId, SubmitResignationDto dto);

        // Xem đơn của bản thân trong 1 CLB
        Task<ResignationRequestDto?> GetMyRequestAsync(int clubId, string userId);

        // Xem tất cả đơn của bản thân (tất cả CLB)
        Task<IEnumerable<ResignationRequestDto>> GetAllMyRequestsAsync(string userId);

        // CLUB_ADMIN xem đơn của DEPT_LEAD trong CLB
        Task<PagedResult<ResignationRequestDto>> GetByClubAsync(
            int clubId,
            string requesterUserId,
            bool isSuperAdmin,
            ResignationListQuery request);

        // SUPER_ADMIN xem đơn của CLUB_ADMIN (tất cả CLB)
        Task<PagedResult<ResignationRequestDto>> GetAllClubAdminRequestsAsync(ResignationListQuery request);

        // Duyệt đơn (CLUB_ADMIN duyệt DEPT_LEAD, SUPER_ADMIN duyệt CLUB_ADMIN)
        Task<ResignationRequestDto> ReviewAsync(
            int requestId,
            ReviewResignationDto dto,
            string reviewerId,
            bool isSuperAdmin,
            int? expectedClubId = null);
    }
}
