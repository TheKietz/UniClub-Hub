using UniClub_Hub.Membership.DTOs.AuditLog;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IClubAuditLogService
    {
        Task<PagedResult<ClubAuditLogDto>> GetByClubAsync(int clubId, string? module, int page, int pageSize);
        Task<PagedResult<ClubAuditLogDto>> GetAllAsync(string? module, int page, int pageSize);
    }
}
