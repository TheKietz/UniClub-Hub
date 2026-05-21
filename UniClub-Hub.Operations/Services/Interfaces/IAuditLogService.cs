using UniClub_Hub.Operations.DTOs.AuditLog;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface IAuditLogService
    {
        Task<PagedResult<AuditLogDto>> GetByClubAsync(
            int clubId,
            string? module,
            int page,
            int pageSize);
    }
}
