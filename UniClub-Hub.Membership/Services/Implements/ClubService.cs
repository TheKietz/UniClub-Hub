using UniClub_Hub.Shared.Common;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Text.Json;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ClubService : IClubService
    {
        private readonly UniClubDbContext _db;
        private readonly ISystemSettingService _settings;
        private readonly IClubPermissionService _permissions;

        public ClubService(
            UniClubDbContext db,
            ISystemSettingService settings,
            IClubPermissionService permissions)
        {
            _db = db;
            _settings = settings;
            _permissions = permissions;
        }

        // ── Public ───────────────────────────────────────────────────────

        public async Task<IEnumerable<ClubDto>> GetAllAsync(int? categoryId = null, string? status = null)
        {
            var query = BuildBaseQuery(categoryId, status);
            return await query.Select(ProjectClubDto).ToListAsync();
        }

        public async Task<ClubDto> GetByIdAsync(int id)
        {
            return await BuildBaseQuery(null, null)
                .Where(c => c.Id == id)
                .Select(ProjectClubDto)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy CLB với ID {id}.");
        }

        public async Task<JsonElement?> GetFormSchemaAsync(int id)
        {
            var club = await _db.Clubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id)
                ?? throw new KeyNotFoundException("Không tìm thấy CLB.");

            if (string.IsNullOrEmpty(club.FormSchema))
                return null;

            return JsonSerializer.Deserialize<JsonElement>(club.FormSchema);
        }

        public async Task UpdateFormSchemaAsync(
            int id,
            JsonElement schema,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await _permissions.EnsureHasPermissionAsync(
                id,
                requesterUserId,
                isSuperAdmin,
                ClubPermissions.RecruitmentFormManage);

            var club = await _db.Clubs.FindAsync(id)
                ?? throw new KeyNotFoundException("Không tìm thấy CLB.");

            club.FormSchema = JsonSerializer.Serialize(schema);
            await _db.SaveChangesAsync();
        }

        public async Task<ClubDto> UpdateSettingsAsync(
            int id,
            UpdateClubSettingsDto dto,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await _permissions.EnsureHasPermissionAsync(
                id,
                requesterUserId,
                isSuperAdmin,
                ClubPermissions.ClubSettingsManage);

            var club = await _db.Clubs.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy CLB.");

            club.Description = dto.Description;
            club.ContactInfo = dto.ContactInfo;
            club.AdvisorName = dto.AdvisorName;
            club.LogoUrl = dto.LogoUrl;

            await _db.SaveChangesAsync();
            return await GetByIdAsync(id);
        }

        // ── Admin ─────────────────────────────────────────────────────────

        public async Task<IEnumerable<AdminClubDto>> GetAllAdminAsync(int? categoryId = null, string? status = null)
        {
            var query = BuildBaseQuery(categoryId, status);
            return await query.Select(ProjectAdminClubDto).ToListAsync();
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
                    ? query.OrderByDescending(c => c.ClubMemberships!.Where(m => m.Status == MembershipStatus.Active).Select(m => m.UserId).Distinct().Count())
                    : query.OrderBy(c => c.ClubMemberships!.Where(m => m.Status == MembershipStatus.Active).Select(m => m.UserId).Distinct().Count()),
                "status" => desc ? query.OrderByDescending(c => c.Status) : query.OrderBy(c => c.Status),
                "createdat" => desc ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt),
                _ => desc ? query.OrderByDescending(c => c.Id) : query.OrderBy(c => c.Id),
            };
            query = orderedQuery.ThenBy(c => c.Id);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(ProjectAdminClubDto)
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
                .Select(ProjectAdminClubDto)
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

            // Tạo CLB trước; Trưởng CLB bổ nhiệm sau qua quản lý thành viên.
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
                await _db.SaveChangesAsync();

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

                // Tạo các vị trí mặc định làm template (idempotent — chỉ khi CLB chưa có vị trí).
                await EnsureDefaultPositionsAsync(club.Id);

                await transaction.CommitAsync();
                return await GetByIdAdminAsync(club.Id);
            }
            catch
            {
                await transaction.RollbackAsync(); // Rollback nếu có lỗi
                throw; // Ném lại lỗi để xử lý ở tầng trên
            }
        }

        // Tạo các vị trí (Position) mặc định làm template nếu CLB chưa có vị trí nào (idempotent).
        // Dùng cho cả CLB tạo mới lẫn bù cho CLB cũ. Không tự gán cho ai — Trưởng CLB đã có toàn
        // quyền qua vai trò CLUB_ADMIN, các vị trí này chỉ để gán cho thành viên khác khi cần.
        public async Task EnsureDefaultPositionsAsync(int clubId)
        {
            if (await _db.ClubPositions.IgnoreQueryFilters().AnyAsync(p => p.ClubId == clubId))
                return;

            var vicePresidentPerms = new[]
            {
                ClubPermissions.MembersView, ClubPermissions.MembersManage,
                ClubPermissions.ApplicationsView, ClubPermissions.ApplicationsReview,
                ClubPermissions.ResignationsView, ClubPermissions.OrgChartView,
                ClubPermissions.PositionAssignmentsManage, ClubPermissions.ReportsView,
                ClubPermissions.TasksView, ClubPermissions.TasksManage,
                ClubPermissions.EventsView, ClubPermissions.EventsManage,
                ClubPermissions.NotificationsView,
            };
            var treasurerPerms = new[]
            {
                ClubPermissions.ReportsView, ClubPermissions.ReportsExport,
                ClubPermissions.EventsView, ClubPermissions.EventParticipantsManage,
                ClubPermissions.NotificationsView,
            };
            _db.ClubPositions.AddRange(
                new ClubPosition
                {
                    ClubId = clubId, Name = "Chủ nhiệm CLB",
                    Description = "Điều phối toàn bộ hoạt động, nhân sự, tuyển thành viên và cấu hình CLB.",
                    IsDefault = true, CanBeAssignedByDeptLead = false, IsUnique = true,
                    Permissions = ClubPermissions.All
                        .Select(p => new ClubPositionPermission { PermissionCode = p.Code }).ToList(),
                },
                new ClubPosition
                {
                    ClubId = clubId, Name = "Phó chủ nhiệm",
                    Description = "Hỗ trợ chủ nhiệm điều phối nhân sự, sự kiện và vận hành CLB.",
                    IsDefault = true, CanBeAssignedByDeptLead = false, IsUnique = true,
                    Permissions = vicePresidentPerms
                        .Select(c => new ClubPositionPermission { PermissionCode = c }).ToList(),
                },
                new ClubPosition
                {
                    ClubId = clubId, Name = "Thủ quỹ",
                    Description = "Theo dõi thu chi, xuất báo cáo và hỗ trợ tổng kết sự kiện.",
                    IsDefault = false, CanBeAssignedByDeptLead = false, IsUnique = true,
                    Permissions = treasurerPerms
                        .Select(c => new ClubPositionPermission { PermissionCode = c }).ToList(),
                });
            await _db.SaveChangesAsync();
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
                .AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(c => c.CategoryId == categoryId);

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ClubStatus>(status, true, out var parsedStatus))
                query = query.Where(c => c.Status == parsedStatus);

            return query;
        }

        // jsonb FormSchema: EF/Npgsql không dịch IsNullOrWhiteSpace hay so sánh chuỗi rỗng an toàn — chỉ check NOT NULL.
        // Giá trị `{}`/`[]` vẫn được coi là đang tuyển (hợp lý vì đã có schema).
        private static readonly Expression<Func<Club, ClubDto>> ProjectClubDto = c => new ClubDto
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
            MemberCount = c.ClubMemberships!.Where(m => m.Status == MembershipStatus.Active)
                .Select(m => m.UserId).Distinct().Count(),
            IsRecruiting = c.Status == ClubStatus.Active && c.FormSchema != null,
            CreatedAt = c.CreatedAt
        };

        private static readonly Expression<Func<Club, AdminClubDto>> ProjectAdminClubDto = c => new AdminClubDto
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
            MemberCount = c.ClubMemberships!.Where(m => m.Status == MembershipStatus.Active)
                .Select(m => m.UserId).Distinct().Count(),
            HasAdmin = c.ClubMemberships!.Any(m =>
                m.ClubRole == ClubRole.CLUB_ADMIN &&
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
