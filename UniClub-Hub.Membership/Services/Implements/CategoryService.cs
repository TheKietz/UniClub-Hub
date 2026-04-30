using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Category;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class CategoryService : ICategoryService
    {
        private readonly UniClubDbContext _db;

        public CategoryService(UniClubDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<CategoryDto>> GetAllAsync()
        {
            return await _db.Categories
                .AsNoTracking()
                .Select(c => new CategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Description = c.Description,
                    ClubCount = c.Clubs!.Count()
                })
                .ToListAsync();
        }

        public async Task<CategoryDto> GetByIdAsync(int id)
        {
            var category = await _db.Categories
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => new CategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Description = c.Description,
                    ClubCount = c.Clubs!.Count()
                })
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy lĩnh vực với ID {id}.");

            return category;
        }

        public async Task<CategoryDto> CreateAsync(CreateCategoryDto dto)
        {
            var exists = await _db.Categories.AnyAsync(c => c.Name == dto.Name);
            if (exists)
                throw new InvalidOperationException("Tên lĩnh vực đã tồn tại.");

            var category = new Category
            {
                Name = dto.Name,
                Description = dto.Description
            };

            _db.Categories.Add(category);
            await _db.SaveChangesAsync();

            return new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                ClubCount = 0
            };
        }

        public async Task<CategoryDto> UpdateAsync(int id, UpdateCategoryDto dto)
        {
            var category = await _db.Categories.FindAsync(id)
                ?? throw new KeyNotFoundException($"Không tìm thấy lĩnh vực với ID {id}.");

            var nameTaken = await _db.Categories
                .AnyAsync(c => c.Name == dto.Name && c.Id != id);
            if (nameTaken)
                throw new InvalidOperationException("Tên lĩnh vực đã tồn tại.");

            category.Name = dto.Name;
            category.Description = dto.Description;
            await _db.SaveChangesAsync();

            return new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                ClubCount = await _db.Clubs.CountAsync(c => c.CategoryId == id)
            };
        }

        public async Task DeleteAsync(int id)
        {
            var category = await _db.Categories.FindAsync(id)
                ?? throw new KeyNotFoundException($"Không tìm thấy lĩnh vực với ID {id}.");

            var hasClubs = await _db.Clubs.AnyAsync(c => c.CategoryId == id);
            if (hasClubs)
                throw new InvalidOperationException("Không thể xóa lĩnh vực đang có CLB.");

            _db.Categories.Remove(category);
            await _db.SaveChangesAsync();
        }
    }
}
