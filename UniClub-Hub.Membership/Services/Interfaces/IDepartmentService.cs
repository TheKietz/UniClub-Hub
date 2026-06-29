using UniClub_Hub.Shared.Common;
using UniClub_Hub.Membership.DTOs.Department;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IDepartmentService
    {
        Task<IEnumerable<DepartmentDto>> GetAllAsync(int clubId);
        Task<DepartmentDto> GetByIdAsync(int clubId, int id);
        Task<AdminDepartmentDto> CreateAsync(int clubId, CreateDepartmentDto dto, string requesterUserId, bool isSuperAdmin);
        Task<AdminDepartmentDto> UpdateAsync(int clubId, int id, UpdateDepartmentDto dto, string requesterUserId, bool isSuperAdmin);
        Task DeleteAsync(int clubId, int id, string requesterUserId, bool isSuperAdmin);
        Task SetLeadAsync(int clubId, int departmentId, int? membershipId, string requesterUserId, bool isSuperAdmin);
    }
}
