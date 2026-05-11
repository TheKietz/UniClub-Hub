using UniClub_Hub.Shared.Common;
using UniClub_Hub.Membership.DTOs.Category;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface ICategoryService
    {
        Task<IEnumerable<CategoryDto>> GetAllAsync();
        Task<CategoryDto> GetByIdAsync(int id);
        Task<CategoryDto> CreateAsync(CreateCategoryDto dto);
        Task<CategoryDto> UpdateAsync(int id, UpdateCategoryDto dto);
        Task DeleteAsync(int id);
    }
}
