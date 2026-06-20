using UniClub_Hub.Shared.Common;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ClubService : IClubService
    {
        private readonly UniClubDbContext _db;
        private readonly IClubMembershipService _membershipService;
        private readonly ISystemSettingService _settings;

        public ClubService(UniClubDbContext db, IClubMembershipService membershipService, ISystemSettingService settings)
        {
            _db = db;
            _membershipService = membershipService;
            _settings = settings;
        }

        // ── Public ───────────────────────────────────────────────────────

        public async Task<IEnumerable<ClubDto>> GetAllAsync(int? categoryId = null, string? status = null)
        {
            var query = BuildBaseQuery(categoryId, status);
            return await query.Select(c => ToDto(c)).ToListAsync();
        }

        public async Task<ClubDto> GetByIdAsync(int id)
        {
            return await BuildBaseQuery(null, null)
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

        public async Task<PagedResult<AdminClubDto>> GetAllAdminPageAsync(AdminClubListQuery request)
        {
            var page = Math.Max(1, request.Page);
            var pageSize = Math.Clamp(request.PageSize, 1, 100);
            var query = BuildBaseQuery(request.CategoryId, request.Status);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(s) ||
                    c.Code.ToLower().Contains(s) ||
                    (c.Description != null && c.Description.ToLower().Contains(s)) ||
                    (c.AdvisorName != null && c.AdvisorName.ToLower().Contains(s)) ||
                    (c.ContactInfo != null && c.ContactInfo.ToLower().Contains(s)));
            }

            var sortBy = request.SortBy.Trim().ToLower();
            var desc = request.SortDir.Equals("desc", StringComparison.OrdinalIgnoreCase);
            var orderedQuery = sortBy switch
            {
                "name" => desc ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name),
                "code" => desc ? query.OrderByDescending(c => c.Code) : query.OrderBy(c => c.Code),
                "members" => desc
                    ? query.OrderByDescending(c => c.ClubMemberships!.Count(m => m.Status == MembershipStatus.Active))
                    : query.OrderBy(c => c.ClubMemberships!.Count(m => m.Status == MembershipStatus.Active)),
                "status" => desc ? query.OrderByDescending(c => c.Status) : query.OrderBy(c => c.Status),
                "createdat" => desc ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt),
                _ => desc ? query.OrderByDescending(c => c.Id) : query.OrderBy(c => c.Id),
            };
            query = orderedQuery.ThenBy(c => c.Id);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => ToAdminDto(c))
                .ToListAsync();

            return new PagedResult<AdminClubDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<AdminClubDto> GetByIdAdminAsync(int id)
        {
            return await BuildBaseQuery(null, null)
                .Where(c => c.Id == id)
                .Select(c => ToAdminDto(c))
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy CLB với ID {id}.");
        }

        // ── Admin ─────────────────────────────────────────────────────────

        public async Task<AdminClubDto> CreateAsync(CreateClubDto dto)
        {
            // 1. Kiểm tra mã CLB và các ràng buộc khác
            if (await _db.Clubs.AnyAsync(c => c.Code == dto.Code.ToUpper()))
                throw new InvalidOperationException($"Mã CLB '{dto.Code}' đã tồn tại.");

            if (dto.CategoryId.HasValue &&
                !await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId))
                throw new KeyNotFoundException("Lĩnh vực không tồn tại.");

            // Kiểm tra ClubAdminId có hợp lệ không
            if (string.IsNullOrEmpty(dto.ClubAdminId)) // This check is redundant if [Required] is used in DTO and model validation is enabled. Keeping for defensive programming.
                throw new ArgumentException("ID của Trưởng câu lạc bộ là bắt buộc."); // Changed "Chủ nhiệm CLB" to "Trưởng câu lạc bộ"
            if (!await _db.Users.AnyAsync(u => u.Id == dto.ClubAdminId))
                throw new KeyNotFoundException($"Không tìm thấy người dùng với ID {dto.ClubAdminId} để gán làm Trưởng câu lạc bộ."); // Changed "Chủ nhiệm" to "Trưởng câu lạc bộ"

            // Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
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
                    Status = ClubStatus.Active
                };

                _db.Clubs.Add(club);
                await _db.SaveChangesAsync(); // Lưu để có club.Id

                // Gán Trưởng câu lạc bộ ngay lập tức bằng dịch vụ ClubMembershipService
                await _membershipService.AssignClubAdminAsync(club.Id, dto.ClubAdminId);

                // Tạo ban mặc định theo cài đặt hệ thống
                var defaultDepts = await _settings.GetValueAsync("club.default_departments");
                if (!string.IsNullOrWhiteSpace(defaultDepts))
                {
                    var deptNames = defaultDepts
                        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                        .Distinct(StringComparer.OrdinalIgnoreCase);
                    foreach (var name in deptNames)
                        _db.Departments.Add(new Department { ClubId = club.Id, Name = name });
                    await _db.SaveChangesAsync();
                }

                // Tạo quy trình tuyển mặc định cho CLB mới.
                var defaultStages = new[] { "Xét CV", "Phỏng vấn", "Thử việc" };
                for (var i = 0; i < defaultStages.Length; i++)
                {
                    _db.ClubPipelineStages.Add(new ClubPipelineStage
                    {
                        ClubId = club.Id,
                        Name = defaultStages[i],
                        StageOrder = i + 1,
                        IsActive = true
                    });
                }
                await _db.SaveChangesAsync();

                await transaction.CommitAsync(); // Hoàn tất transaction
                return await GetByIdAdminAsync(club.Id);
            }
            catch
            {
                await transaction.RollbackAsync(); // Rollback nếu có lỗi
                throw; // Ném lại lỗi để xử lý ở tầng trên
            }
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
            var query = _db.Clubs
                .AsNoTracking()
                .Include(c => c.Category)
                .Include(c => c.ClubMemberships)
                .AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(c => c.CategoryId == categoryId);

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ClubStatus>(status, true, out var parsedStatus))
                query = query.Where(c => c.Status == parsedStatus);

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
            MemberCount = c.ClubMemberships!.Count(m => m.Status == MembershipStatus.Active),
            IsRecruiting = c.Status == ClubStatus.Active && !string.IsNullOrWhiteSpace(c.FormSchema),
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
            MemberCount = c.ClubMemberships!.Count(m => m.Status == MembershipStatus.Active),
            HasAdmin = c.ClubMemberships!.Any(m =>
                m.ClubRole == UniClub_Hub.Shared.Enums.ClubRole.CLUB_ADMIN &&
                m.Status == MembershipStatus.Active),
            CreatedAt = c.CreatedAt,
            CreatedBy = c.CreatedBy,
            UpdatedAt = c.UpdatedAt,
            UpdatedBy = c.UpdatedBy,
            DeletedBy = c.DeletedBy,
            IsDeleted = c.IsDeleted
        };
    }
}
