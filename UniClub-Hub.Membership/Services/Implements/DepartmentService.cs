using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Department;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class DepartmentService : IDepartmentService
    {
        private readonly UniClubDbContext _db;

        public DepartmentService(UniClubDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<DepartmentDto>> GetAllAsync(int clubId)
        {
            await EnsureClubExistsAsync(clubId);

            return await _db.Departments
                .AsNoTracking()
                .Where(d => d.ClubId == clubId)
                .Select(d => ToDto(d))
                .ToListAsync();
        }

        public async Task<DepartmentDto> GetByIdAsync(int clubId, int id)
        {
            return await _db.Departments
                .AsNoTracking()
                .Where(d => d.ClubId == clubId && d.Id == id)
                .Select(d => ToDto(d))
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy ban với ID {id} trong CLB này.");
        }

        public async Task<AdminDepartmentDto> CreateAsync(int clubId, CreateDepartmentDto dto)
        {
            await EnsureClubExistsAsync(clubId);

            var nameTaken = await _db.Departments
                .AnyAsync(d => d.ClubId == clubId && d.Name == dto.Name);
            if (nameTaken)
                throw new InvalidOperationException($"Ban '{dto.Name}' đã tồn tại trong CLB này.");

            var department = new Department
            {
                ClubId = clubId,
                Name = dto.Name,
                Description = dto.Description
            };

            _db.Departments.Add(department);
            await _db.SaveChangesAsync();

            return await GetAdminByIdAsync(clubId, department.Id);
        }

        public async Task<AdminDepartmentDto> UpdateAsync(int clubId, int id, UpdateDepartmentDto dto)
        {
            var department = await _db.Departments
                .FirstOrDefaultAsync(d => d.ClubId == clubId && d.Id == id)
                ?? throw new KeyNotFoundException($"Không tìm thấy ban với ID {id} trong CLB này.");

            var nameTaken = await _db.Departments
                .AnyAsync(d => d.ClubId == clubId && d.Name == dto.Name && d.Id != id);
            if (nameTaken)
                throw new InvalidOperationException($"Ban '{dto.Name}' đã tồn tại trong CLB này.");

            department.Name = dto.Name;
            department.Description = dto.Description;
            await _db.SaveChangesAsync();

            return await GetAdminByIdAsync(clubId, department.Id);
        }

        public async Task DeleteAsync(int clubId, int id)
        {
            var department = await _db.Departments
                .FirstOrDefaultAsync(d => d.ClubId == clubId && d.Id == id)
                ?? throw new KeyNotFoundException($"Không tìm thấy ban với ID {id} trong CLB này.");

            var hasMembers = await _db.ClubMemberships
                .AnyAsync(m => m.DepartmentId == id && m.Status == "Active");
            if (hasMembers)
                throw new InvalidOperationException("Không thể xóa ban đang có thành viên hoạt động.");

            _db.Departments.Remove(department);
            await _db.SaveChangesAsync();
        }

        // ── Helpers ───────────────────────────────────────────────────────

        private async Task EnsureClubExistsAsync(int clubId)
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");
        }

        private async Task<AdminDepartmentDto> GetAdminByIdAsync(int clubId, int id)
        {
            return await _db.Departments
                .AsNoTracking()
                .Where(d => d.ClubId == clubId && d.Id == id)
                .Select(d => ToAdminDto(d))
                .FirstAsync();
        }

        private static DepartmentDto ToDto(Department d) => new()
        {
            Id = d.Id,
            ClubId = d.ClubId,
            Name = d.Name,
            Description = d.Description,
            MemberCount = d.Members!.Count(m => m.Status == "Active")
        };

        private static AdminDepartmentDto ToAdminDto(Department d) => new()
        {
            Id = d.Id,
            ClubId = d.ClubId,
            Name = d.Name,
            Description = d.Description,
            MemberCount = d.Members!.Count(m => m.Status == "Active"),
            CreatedAt = d.CreatedAt,
            CreatedBy = d.CreatedBy,
            UpdatedAt = d.UpdatedAt,
            UpdatedBy = d.UpdatedBy,
            DeletedBy = d.DeletedBy,
            IsDeleted = d.IsDeleted
        };
    }
}
