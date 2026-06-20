using UniClub_Hub.Operations.DTOs.Kpi;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface IKpiService
    {
        Task<PersonalKpiResponse> GetPersonalKpiAsync(string userId, int clubId, int? departmentId, int? sprintId);
        Task<DepartmentKpiResponse> GetDepartmentKpiAsync(int departmentId, int clubId, string requesterId, int? sprintId);
    }
}
