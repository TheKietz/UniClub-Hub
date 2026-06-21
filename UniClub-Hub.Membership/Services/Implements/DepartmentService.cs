using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Department;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class DepartmentService : IDepartmentService
    {
        private readonly UniClubDbContext _db;
        private readonly INotificationService _notifications;
        private readonly ISystemSettingService _settings;
        private readonly IClubPermissionService _permissions;

        public DepartmentService(
            UniClubDbContext db,
            INotificationService notifications,
            ISystemSettingService settings,
            IClubPermissionService permissions)
        {
            _db = db;
            _notifications = notifications;
            _settings = settings;
            _permissions = permissions;
        }

        public async Task<IEnumerable<DepartmentDto>> GetAllAsync(int clubId)
        {
            await EnsureClubExistsAsync(clubId);

            return await _db.Departments
                .AsNoTracking()
                .Include(d => d.Members).ThenInclude(m => m.User)
                .Where(d => d.ClubId == clubId)
                .Select(d => ToDto(d))
                .ToListAsync();
        }

        public async Task<DepartmentDto> GetByIdAsync(int clubId, int id)
        {
            return await _db.Departments
                .AsNoTracking()
                .Include(d => d.Members).ThenInclude(m => m.User)
                .Where(d => d.ClubId == clubId && d.Id == id)
                .Select(d => ToDto(d))
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy ban với ID {id} trong CLB này.");
        }

        public async Task<AdminDepartmentDto> CreateAsync(
            int clubId,
            CreateDepartmentDto dto,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await EnsureCanManageAsync(clubId, requesterUserId, isSuperAdmin);
            await EnsureClubExistsAsync(clubId);

            // Kiểm tra giới hạn số ban
            var maxDeptsVal = await _settings.GetValueAsync("club.max_departments");
            if (int.TryParse(maxDeptsVal, out var maxDepts) && maxDepts > 0)
            {
                var currentCount = await _db.Departments.CountAsync(d => d.ClubId == clubId);
                if (currentCount >= maxDepts)
                    throw new InvalidOperationException($"CLB đã đạt giới hạn {maxDepts} ban.");
            }

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

        public async Task<AdminDepartmentDto> UpdateAsync(
            int clubId,
            int id,
            UpdateDepartmentDto dto,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await EnsureCanManageAsync(clubId, requesterUserId, isSuperAdmin);
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

        public async Task DeleteAsync(int clubId, int id, string requesterUserId, bool isSuperAdmin)
        {
            await EnsureCanManageAsync(clubId, requesterUserId, isSuperAdmin);
            var department = await _db.Departments
                .FirstOrDefaultAsync(d => d.ClubId == clubId && d.Id == id)
                ?? throw new KeyNotFoundException($"Không tìm thấy ban với ID {id} trong CLB này.");

            // Lấy tất cả thành viên đang hoạt động trong ban
            var affected = await _db.ClubMemberships
                .Where(m => m.DepartmentId == id &&
                    (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                .ToListAsync();

            // Auto-demote: xóa department, hạ DEPT_LEAD → MEMBER
            foreach (var m in affected)
            {
                m.DepartmentId = null;
                if (m.ClubRole == ClubRole.DEPT_LEAD)
                    m.ClubRole = ClubRole.MEMBER;
            }

            _db.Departments.Remove(department);
            await _db.SaveChangesAsync();

            // Thông báo cho từng người bị ảnh hưởng
            var deptDeletedMsg = await _settings.GetNotificationTextAsync("notification.msg.dept_deleted", new() { ["deptName"] = department.Name });
            if (!string.IsNullOrEmpty(deptDeletedMsg))
                foreach (var m in affected)
                    await _notifications.SendAsync(m.UserId, "Ban bộ phận đã bị giải thể", deptDeletedMsg, NotificationType.System);
        }

        public async Task SetLeadAsync(
            int clubId,
            int deptId,
            int? membershipId,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await EnsureCanManageAsync(clubId, requesterUserId, isSuperAdmin);
            var department = await _db.Departments.FirstOrDefaultAsync(d => d.ClubId == clubId && d.Id == deptId)
                ?? throw new KeyNotFoundException($"Không tìm thấy ban với ID {deptId} trong CLB này.");

            // Hạ trưởng ban cũ
            var oldLead = await _db.ClubMemberships.FirstOrDefaultAsync(m =>
                m.DepartmentId == deptId && m.ClubRole == ClubRole.DEPT_LEAD);
            if (oldLead != null)
                oldLead.ClubRole = ClubRole.MEMBER;

            // Bổ nhiệm trưởng ban mới
            if (membershipId.HasValue)
            {
                var newLead = await _db.ClubMemberships.FirstOrDefaultAsync(m =>
                    m.Id == membershipId.Value && m.DepartmentId == deptId)
                    ?? throw new KeyNotFoundException("Thành viên không thuộc ban này.");
                newLead.ClubRole = ClubRole.DEPT_LEAD;
            }

            await _db.SaveChangesAsync();
        }

        // ── Helpers ───────────────────────────────────────────────────────

        private async Task EnsureClubExistsAsync(int clubId)
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");
        }

        private Task EnsureCanManageAsync(int clubId, string requesterUserId, bool isSuperAdmin) =>
            _permissions.EnsureHasPermissionAsync(
                clubId,
                requesterUserId,
                isSuperAdmin,
                ClubPermissions.DepartmentsManage);

        private async Task<AdminDepartmentDto> GetAdminByIdAsync(int clubId, int id)
        {
            return await _db.Departments
                .AsNoTracking()
                .Include(d => d.Members).ThenInclude(m => m.User)
                .Where(d => d.ClubId == clubId && d.Id == id)
                .Select(d => ToAdminDto(d))
                .FirstAsync();
        }

        private static DepartmentDto ToDto(Department d)
        {
            var lead = d.Members?.FirstOrDefault(m => m.ClubRole == ClubRole.DEPT_LEAD && m.Status == MembershipStatus.Active);
            return new()
            {
                Id = d.Id,
                ClubId = d.ClubId,
                Name = d.Name,
                Description = d.Description,
                MemberCount = d.Members!.Count(m => m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation),
                DeptLeadMembershipId = lead?.Id,
                DeptLeadName = lead?.User?.FullName ?? lead?.User?.Email,
            };
        }

        private static AdminDepartmentDto ToAdminDto(Department d)
        {
            var lead = d.Members?.FirstOrDefault(m => m.ClubRole == ClubRole.DEPT_LEAD && m.Status == MembershipStatus.Active);
            return new()
            {
                Id = d.Id,
                ClubId = d.ClubId,
                Name = d.Name,
                Description = d.Description,
                MemberCount = d.Members!.Count(m => m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation),
                DeptLeadMembershipId = lead?.Id,
                DeptLeadName = lead?.User?.FullName ?? lead?.User?.Email,
                CreatedAt = d.CreatedAt,
                CreatedBy = d.CreatedBy,
                UpdatedAt = d.UpdatedAt,
                UpdatedBy = d.UpdatedBy,
                DeletedBy = d.DeletedBy,
                IsDeleted = d.IsDeleted
            };
        }
    }
}
