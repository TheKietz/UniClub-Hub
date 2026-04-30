using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ClubService : IClubService
    {
        private readonly UniClubDbContext _db;

        public ClubService(UniClubDbContext db)
        {
            _db = db;
        }

        // ── Public ───────────────────────────────────────────────────────

        public async Task<IEnumerable<ClubDto>> GetAllAsync(int? categoryId = null, string? status = null)
        {
            var query = BuildBaseQuery(categoryId, status);
            return await query.Select(c => ToDto(c)).ToListAsync();
        }

        public async Task<ClubDto> GetByIdAsync(int id)
        {
            return await _db.Clubs
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => ToDto(c))
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy CLB với ID {id}.");
        }

        // ── Admin ─────────────────────────────────────────────────────────

        public async Task<IEnumerable<AdminClubDto>> GetAllAdminAsync(int? categoryId = null, string? status = null)
        {
            var query = BuildBaseQuery(categoryId, status);
            return await query.Select(c => ToAdminDto(c)).ToListAsync();
        }

        public async Task<AdminClubDto> GetByIdAdminAsync(int id)
        {
            return await _db.Clubs
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => ToAdminDto(c))
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy CLB với ID {id}.");
        }

        public async Task<AdminClubDto> CreateAsync(CreateClubDto dto)
        {
            if (await _db.Clubs.AnyAsync(c => c.Code == dto.Code.ToUpper()))
                throw new InvalidOperationException($"Mã CLB '{dto.Code}' đã tồn tại.");

            if (dto.CategoryId.HasValue &&
                !await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId))
                throw new KeyNotFoundException("Lĩnh vực không tồn tại.");

            var club = new Club
            {
                Name = dto.Name,
                Code = dto.Code.ToUpper(),
                CategoryId = dto.CategoryId,
                Description = dto.Description,
                LogoUrl = dto.LogoUrl,
                ContactInfo = dto.ContactInfo,
                EstablishedDate = dto.EstablishedDate,
                AdvisorName = dto.AdvisorName,
                Status = "Active"
            };

            _db.Clubs.Add(club);
            await _db.SaveChangesAsync();

            return await GetByIdAdminAsync(club.Id);
        }

        public async Task<AdminClubDto> UpdateAsync(int id, UpdateClubDto dto)
        {
            var club = await _db.Clubs.FindAsync(id)
                ?? throw new KeyNotFoundException($"Không tìm thấy CLB với ID {id}.");

            if (dto.CategoryId.HasValue &&
                !await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId))
                throw new KeyNotFoundException("Lĩnh vực không tồn tại.");

            club.Name = dto.Name;
            club.CategoryId = dto.CategoryId;
            club.Description = dto.Description;
            club.LogoUrl = dto.LogoUrl;
            club.ContactInfo = dto.ContactInfo;
            club.EstablishedDate = dto.EstablishedDate;
            club.AdvisorName = dto.AdvisorName;
            club.Status = dto.Status;

            await _db.SaveChangesAsync();

            return await GetByIdAdminAsync(club.Id);
        }

        public async Task DeleteAsync(int id)
        {
            var club = await _db.Clubs.FindAsync(id)
                ?? throw new KeyNotFoundException($"Không tìm thấy CLB với ID {id}.");

            _db.Clubs.Remove(club);
            await _db.SaveChangesAsync();
        }

        // ── Helpers ───────────────────────────────────────────────────────

        private IQueryable<Club> BuildBaseQuery(int? categoryId, string? status)
        {
            var query = _db.Clubs.AsNoTracking().AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(c => c.CategoryId == categoryId);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(c => c.Status == status);

            return query;
        }

        private static ClubDto ToDto(Club c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Code = c.Code,
            Status = c.Status,
            Description = c.Description,
            LogoUrl = c.LogoUrl,
            ContactInfo = c.ContactInfo,
            EstablishedDate = c.EstablishedDate,
            AdvisorName = c.AdvisorName,
            CategoryId = c.CategoryId,
            CategoryName = c.Category != null ? c.Category.Name : null,
            MemberCount = c.ClubMemberships!.Count(m => m.Status == "Active"),
            CreatedAt = c.CreatedAt
        };

        private static AdminClubDto ToAdminDto(Club c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Code = c.Code,
            Status = c.Status,
            Description = c.Description,
            LogoUrl = c.LogoUrl,
            ContactInfo = c.ContactInfo,
            EstablishedDate = c.EstablishedDate,
            AdvisorName = c.AdvisorName,
            CategoryId = c.CategoryId,
            CategoryName = c.Category != null ? c.Category.Name : null,
            MemberCount = c.ClubMemberships!.Count(m => m.Status == "Active"),
            CreatedAt = c.CreatedAt,
            CreatedBy = c.CreatedBy,
            UpdatedAt = c.UpdatedAt,
            UpdatedBy = c.UpdatedBy,
            DeletedBy = c.DeletedBy,
            IsDeleted = c.IsDeleted
        };
    }
}
