using UniClub_Hub.Membership.DTOs.Department;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IDepartmentService
    {
        Task<IEnumerable<DepartmentDto>> GetAllAsync(int clubId);
        Task<DepartmentDto> GetByIdAsync(int clubId, int id);
        Task<AdminDepartmentDto> CreateAsync(int clubId, CreateDepartmentDto dto);
        Task<AdminDepartmentDto> UpdateAsync(int clubId, int id, UpdateDepartmentDto dto);
        Task DeleteAsync(int clubId, int id);
    }
}
