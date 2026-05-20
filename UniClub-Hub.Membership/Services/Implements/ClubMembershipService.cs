using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ClubMembershipService : IClubMembershipService
    {
        private readonly UniClubDbContext _db;
        private readonly INotificationService _notifications;

        public ClubMembershipService(UniClubDbContext db, INotificationService notifications)
        {
            _db = db;
            _notifications = notifications;
        }

        // ── Public ───────────────────────────────────────────────────────

        public async Task<IEnumerable<MemberDto>> GetAllAsync(int clubId, string? status = null)
        {
            await EnsureClubExistsAsync(clubId);

            var query = _db
                .ClubMemberships.AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.Department)
                .Where(m => m.ClubId == clubId);

            if (
                !string.IsNullOrEmpty(status)
                && Enum.TryParse<MembershipStatus>(status, true, out var parsedStatus)
            )
                query = query.Where(m => m.Status == parsedStatus);

            return await query.Select(m => ToDto(m)).ToListAsync();
        }

        public async Task<MemberDto> GetByIdAsync(int clubId, int membershipId)
        {
            return await _db
                    .ClubMemberships.AsNoTracking()
                    .Include(m => m.User)
                    .Include(m => m.Department)
                    .Where(m => m.ClubId == clubId && m.Id == membershipId)
                    .Select(m => ToDto(m))
                    .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy thành viên này trong CLB.");
        }

        // ── CLUB_ADMIN (có kiểm tra quyền) ───────────────────────────────

        public async Task<MemberDto> AddMemberAsync(
            int clubId,
            AddMemberDto dto,
            string requestUserId
        )
        {
            await EnsureCanManageAsync(clubId, requestUserId);
            return await AddMemberCoreAsync(clubId, dto);
        }

        public async Task<MemberDto> UpdateMemberAsync(
            int clubId,
            int membershipId,
            UpdateMemberDto dto,
            string requestUserId
        )
        {
            await EnsureCanManageAsync(clubId, requestUserId);
            return await UpdateMemberCoreAsync(clubId, membershipId, dto);
        }

        public async Task RemoveMemberAsync(int clubId, int membershipId, string requestUserId)
        {
            await EnsureCanManageAsync(clubId, requestUserId);
            await RemoveMemberCoreAsync(clubId, membershipId);
        }

        // ── SUPER_ADMIN (bypass quyền) ────────────────────────────────────

        public Task<MemberDto> AddMemberAsAdminAsync(int clubId, AddMemberDto dto) =>
            AddMemberCoreAsync(clubId, dto);

        public Task<MemberDto> UpdateMemberAsAdminAsync(
            int clubId,
            int membershipId,
            UpdateMemberDto dto,
            bool force = false
        ) => UpdateMemberCoreAsync(clubId, membershipId, dto, force);

        public Task RemoveMemberAsAdminAsync(int clubId, int membershipId, bool force = false) =>
            RemoveMemberCoreAsync(clubId, membershipId, force);

        public async Task<MemberDto> PromoteMemberAsync(int clubId, int membershipId)
        {
            var membership = await _db.ClubMemberships.FirstOrDefaultAsync(m =>
                m.ClubId == clubId && m.Id == membershipId
            ) ?? throw new KeyNotFoundException("Không tìm thấy thành viên này trong CLB.");

            if (membership.Status != MembershipStatus.Probation)
                throw new InvalidOperationException("Chỉ có thể xác nhận thành viên đang thử việc.");

            membership.Status = MembershipStatus.Active;
            await _db.SaveChangesAsync();

            await _notifications.SendAsync(
                membership.UserId,
                "Xác nhận thành viên chính thức",
                "Chúc mừng! Bạn đã được xác nhận là thành viên chính thức.",
                NotificationType.System
            );

            return await GetByIdAsync(clubId, membershipId);
        }

        // Bổ nhiệm vai trò đặc biệt
        public async Task<MemberDto> AssignClubAdminAsync(int clubId, string userId)
        {
            await EnsureClubExistsAsync(clubId);

            // 1. Kiểm tra xem CLB đã có Trưởng câu lạc bộ chưa
            var currentAdmin = await _db.ClubMemberships
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.ClubId == clubId
                    && m.ClubRole == ClubRole.CLUB_ADMIN
                    && m.Status == MembershipStatus.Active);

            if (currentAdmin != null && currentAdmin.UserId != userId)
            {
                var name = currentAdmin.User?.FullName ?? currentAdmin.User?.Email;
                throw new InvalidOperationException($"Câu lạc bộ đã có Trưởng câu lạc bộ ({name}). Vui lòng hạ cấp người này trước khi bổ nhiệm Trưởng câu lạc bộ mới."); // Changed "Chủ nhiệm" to "Trưởng câu lạc bộ"
            }

            // 2. Tìm hoặc tạo mới membership cho Trưởng câu lạc bộ
            var membership = await _db.ClubMemberships
                .FirstOrDefaultAsync(m => m.ClubId == clubId && m.UserId == userId);

            if (membership == null)
            {
                membership = new ClubMembership
                {
                    UserId = userId,
                    ClubId = clubId,
                    ClubRole = ClubRole.CLUB_ADMIN,
                    Status = MembershipStatus.Active,
                    JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    DepartmentId = null
                };
                _db.ClubMemberships.Add(membership);
            }
            else
            {
                membership.ClubRole = ClubRole.CLUB_ADMIN;
                membership.Status = MembershipStatus.Active;
                membership.DepartmentId = null;
            }

            await _db.SaveChangesAsync();

            var clubNameForAdmin = await _db.Clubs.Where(c => c.Id == clubId).Select(c => c.Name).FirstAsync();
            await _notifications.SendAsync(
                userId,
                "Bổ nhiệm Trưởng CLB",
                $"Bạn đã được bổ nhiệm làm Trưởng câu lạc bộ {clubNameForAdmin}.",
                NotificationType.System
            );

            return await GetByIdAsync(clubId, membership.Id);
        }

        private async Task<MemberDto> AssignDepartmentLeadAsync(int clubId, int departmentId, string userId)
        {
            await EnsureDepartmentBelongsToClubAsync(clubId, departmentId);

            // 1. Kiểm tra xem Ban đã có Trưởng ban chưa
            var currentLead = await _db.ClubMemberships
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.DepartmentId == departmentId
                    && m.ClubRole == ClubRole.DEPT_LEAD
                    && m.Status == MembershipStatus.Active);

            if (currentLead != null && currentLead.UserId != userId)
            {
                var name = currentLead.User?.FullName ?? currentLead.User?.Email;
                throw new InvalidOperationException($"Ban này đã có Trưởng ban ({name}). Vui lòng hạ cấp người này trước khi bổ nhiệm Trưởng ban mới.");
            }

            // 2. Trưởng ban bắt buộc phải là thành viên CLB trước (theo nghiệp vụ thông thường)
            var membership = await _db.ClubMemberships
                .FirstOrDefaultAsync(m => m.ClubId == clubId && m.UserId == userId)
                ?? throw new KeyNotFoundException("Người dùng phải là thành viên CLB trước khi bổ nhiệm làm Trưởng ban.");

            membership.ClubRole = ClubRole.DEPT_LEAD;
            membership.DepartmentId = departmentId;
            membership.Status = MembershipStatus.Active;

            await _db.SaveChangesAsync();

            var deptName = await _db.Departments.Where(d => d.Id == departmentId).Select(d => d.Name).FirstOrDefaultAsync() ?? "ban";
            var clubNameForLead = await _db.Clubs.Where(c => c.Id == clubId).Select(c => c.Name).FirstAsync();
            await _notifications.SendAsync(
                userId,
                "Bổ nhiệm Trưởng ban",
                $"Bạn đã được bổ nhiệm làm Trưởng {deptName} trong CLB {clubNameForLead}.",
                NotificationType.System
            );

            return await GetByIdAsync(clubId, membership.Id);
        }

        // ── Core logic ────────────────────────────────────────────────────

        private async Task<MemberDto> AddMemberCoreAsync(int clubId, AddMemberDto dto)
        {
            await EnsureClubExistsAsync(clubId);

            // Nếu là Trưởng câu lạc bộ hoặc Trưởng ban, dùng hàm chuyên dụng để kiểm tra ràng buộc duy nhất
            if (dto.ClubRole == ClubRole.CLUB_ADMIN)
            {
                return await AssignClubAdminAsync(clubId, dto.UserId);
            }

            if (dto.ClubRole == ClubRole.DEPT_LEAD && dto.DepartmentId.HasValue)
            {
                return await AssignDepartmentLeadAsync(clubId, dto.DepartmentId.Value, dto.UserId);
            }

            if (await _db.Users.FindAsync(dto.UserId) == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng.");

            var alreadyMember = await _db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId
                && m.UserId == dto.UserId
                && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation)
            );
            if (alreadyMember)
                throw new InvalidOperationException("Người dùng đã là thành viên của CLB này.");

            if (dto.DepartmentId.HasValue)
                await EnsureDepartmentBelongsToClubAsync(clubId, dto.DepartmentId.Value);

            var membership = new ClubMembership
            {
                UserId = dto.UserId,
                ClubId = clubId,
                ClubRole = dto.ClubRole,
                DepartmentId = dto.DepartmentId,
                JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Status = MembershipStatus.Active,
            };

            _db.ClubMemberships.Add(membership);
            await _db.SaveChangesAsync();

            var clubName = await _db
                .Clubs.Where(c => c.Id == clubId)
                .Select(c => c.Name)
                .FirstAsync();
            await _notifications.SendAsync(
                dto.UserId,
                "Được thêm vào CLB",
                $"Bạn đã được thêm vào CLB {clubName} với vai trò {dto.ClubRole}.",
                NotificationType.System
            );

            return await GetByIdAsync(clubId, membership.Id);
        }

        private async Task<MemberDto> UpdateMemberCoreAsync(
            int clubId,
            int membershipId,
            UpdateMemberDto dto,
            bool force = false
        )
        {
            var membership =
                await _db.ClubMemberships.FirstOrDefaultAsync(m =>
                    m.ClubId == clubId && m.Id == membershipId
                ) ?? throw new KeyNotFoundException("Không tìm thấy thành viên này trong CLB.");

            // Guard: hạ cấp CLUB_ADMIN khi không có admin khác
            if (membership.ClubRole == ClubRole.CLUB_ADMIN && dto.ClubRole != ClubRole.CLUB_ADMIN)
            {
                var otherAdminExists = await _db.ClubMemberships.AnyAsync(m =>
                    m.ClubId == clubId && m.Id != membershipId &&
                    m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);

                if (!otherAdminExists && !force)
                    throw new InvalidOperationException(
                        "LAST_CLUB_ADMIN: Không thể hạ cấp Trưởng CLB duy nhất. CLB sẽ không có người quản lý.");
            }

            // Thăng cấp lên CLUB_ADMIN
            if (dto.ClubRole == ClubRole.CLUB_ADMIN && membership.ClubRole != ClubRole.CLUB_ADMIN)
                return await AssignClubAdminAsync(clubId, membership.UserId);

            // Thăng cấp lên DEPT_LEAD
            if (dto.ClubRole == ClubRole.DEPT_LEAD && dto.DepartmentId.HasValue && membership.ClubRole != ClubRole.DEPT_LEAD)
                return await AssignDepartmentLeadAsync(clubId, dto.DepartmentId.Value, membership.UserId);

            // Hạ cấp từ DEPT_LEAD → xóa department
            if (membership.ClubRole == ClubRole.DEPT_LEAD && dto.ClubRole != ClubRole.DEPT_LEAD)
                membership.DepartmentId = null;
            else if (dto.DepartmentId.HasValue)
            {
                await EnsureDepartmentBelongsToClubAsync(clubId, dto.DepartmentId.Value);
                membership.DepartmentId = dto.DepartmentId;
            }

            membership.ClubRole = dto.ClubRole;
            await _db.SaveChangesAsync();

            return await GetByIdAsync(clubId, membershipId);
        }

        private async Task RemoveMemberCoreAsync(int clubId, int membershipId, bool force = false)
        {
            var membership =
                await _db.ClubMemberships.FirstOrDefaultAsync(m =>
                    m.ClubId == clubId && m.Id == membershipId
                ) ?? throw new KeyNotFoundException("Không tìm thấy thành viên này trong CLB.");

            if (membership.Status == MembershipStatus.Resigned)
                throw new InvalidOperationException("Thành viên này đã rời CLB.");

            // Guard: không xóa trưởng CLB duy nhất (trừ khi force)
            if (membership.ClubRole == ClubRole.CLUB_ADMIN && membership.Status == MembershipStatus.Active)
            {
                var otherAdminExists = await _db.ClubMemberships.AnyAsync(m =>
                    m.ClubId == clubId && m.Id != membershipId &&
                    m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active);

                if (!otherAdminExists && !force)
                    throw new InvalidOperationException(
                        "LAST_CLUB_ADMIN: Không thể xóa Trưởng CLB duy nhất. CLB sẽ không có người quản lý.");
            }

            membership.Status = MembershipStatus.Resigned;
            membership.ResignedDate = DateOnly.FromDateTime(DateTime.UtcNow);
            await _db.SaveChangesAsync();

            var clubName = await _db.Clubs
                .Where(c => c.Id == membership.ClubId)
                .Select(c => c.Name)
                .FirstAsync();
            await _notifications.SendAsync(
                membership.UserId,
                "Rời khỏi CLB",
                $"Bạn đã được ghi nhận rời khỏi CLB {clubName}.",
                NotificationType.System
            );
        }

        public async Task ResignAsync(int clubId, string userId)
        {
            await EnsureClubExistsAsync(clubId);

            var membership = await _db.ClubMemberships.FirstOrDefaultAsync(m =>
                m.ClubId == clubId && m.UserId == userId &&
                (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                ?? throw new InvalidOperationException("Bạn không phải thành viên của CLB này.");

            // CLUB_ADMIN và DEPT_LEAD phải đệ đơn từ chức qua flow riêng
            if (membership.ClubRole == ClubRole.CLUB_ADMIN || membership.ClubRole == ClubRole.DEPT_LEAD)
                throw new InvalidOperationException(
                    "NEEDS_RESIGNATION_REQUEST: Trưởng CLB và Trưởng ban phải gửi đơn từ chức để được phê duyệt.");

            membership.Status = MembershipStatus.Resigned;
            membership.ResignedDate = DateOnly.FromDateTime(DateTime.UtcNow);
            await _db.SaveChangesAsync();

            var clubName = await _db.Clubs
                .Where(c => c.Id == clubId)
                .Select(c => c.Name)
                .FirstAsync();
            await _notifications.SendAsync(
                userId,
                "Rời khỏi CLB",
                $"Bạn đã rời khỏi CLB {clubName}.",
                NotificationType.System
            );
        }

        // ── Validation helpers ────────────────────────────────────────────

        private async Task EnsureClubExistsAsync(int clubId)
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");
        }

        private async Task EnsureCanManageAsync(int clubId, string userId)
        {
            var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId
                && m.UserId == userId
                && m.ClubRole == UniClub_Hub.Shared.Enums.ClubRole.CLUB_ADMIN
                && m.Status == MembershipStatus.Active
            );

            if (!isClubAdmin)
                throw new UnauthorizedAccessException(
                    "Bạn không có quyền quản lý thành viên trong CLB này."
                );
        }

        private async Task EnsureDepartmentBelongsToClubAsync(int clubId, int departmentId)
        {
            if (!await _db.Departments.AnyAsync(d => d.Id == departmentId && d.ClubId == clubId))
                throw new KeyNotFoundException("Ban không thuộc CLB này.");
        }

        private static MemberDto ToDto(ClubMembership m) =>
            new()
            {
                Id = m.Id,
                UserId = m.UserId,
                FullName = m.User?.FullName ?? m.User?.Email ?? "",
                Email = m.User?.Email ?? "",
                StudentId = m.User?.StudentId,
                AvatarUrl = m.User?.AvatarUrl,
                ClubRole = m.ClubRole,
                DepartmentId = m.DepartmentId,
                DepartmentName = m.Department?.Name,
                JoinedDate = m.JoinedDate,
                Status = m.Status,
            };
    }
}
