using UniClub_Hub.Membership.DTOs.Kpi;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IKpiService
    {
        Task<KpiConfigDto> GetOrCreateConfigAsync(int clubId, string userId, bool isSuperAdmin);

        Task<KpiConfigDto> UpdateCriteriaAsync(
            int clubId,
            List<UpdateKpiCriteriaDto> criteria,
            string userId,
            bool isSuperAdmin
        );

        Task<KpiConfigDto> ToggleCriteriaAsync(
            int clubId,
            KpiMetricKey metricKey,
            bool isEnabled,
            string userId,
            bool isSuperAdmin
        );

        Task<KpiConfigDto> UpdateGradesAsync(
            int clubId,
            UpdateKpiGradesDto dto,
            string userId,
            bool isSuperAdmin
        );

        Task<KpiResultsDto> GetResultsAsync(
            int clubId,
            int? departmentId,
            DateOnly? fromDate,
            DateOnly? toDate,
            string userId,
            bool isSuperAdmin
        );

        Task<MemberKpiResultDto> GetMyResultAsync(
            int clubId,
            DateOnly? fromDate,
            DateOnly? toDate,
            string userId,
            bool isSuperAdmin
        );
    }
}
