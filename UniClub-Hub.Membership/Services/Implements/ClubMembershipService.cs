using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
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

            var query = _db.ClubMemberships.AsNoTracking().Where(m => m.ClubId == clubId);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(m => m.Status == status);

            return await query.Select(m => ToDto(m)).ToListAsync();
        }

        public async Task<MemberDto> GetByIdAsync(int clubId, int membershipId)
        {
            return await _db.ClubMemberships
                .AsNoTracking()
                .Where(m => m.ClubId == clubId && m.Id == membershipId)
                .Select(m => ToDto(m))
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy thành viên này trong CLB.");
        }

        // ── CLUB_ADMIN (có kiểm tra quyền) ───────────────────────────────

        public async Task<MemberDto> AddMemberAsync(int clubId, AddMemberDto dto, string requestUserId)
        {
            await EnsureCanManageAsync(clubId, requestUserId);
            return await AddMemberCoreAsync(clubId, dto);
        }

        public async Task<MemberDto> UpdateMemberAsync(int clubId, int membershipId, UpdateMemberDto dto, string requestUserId)
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

        public Task<MemberDto> AddMemberAsAdminAsync(int clubId, AddMemberDto dto)
            => AddMemberCoreAsync(clubId, dto);

        public Task<MemberDto> UpdateMemberAsAdminAsync(int clubId, int membershipId, UpdateMemberDto dto)
            => UpdateMemberCoreAsync(clubId, membershipId, dto);

        public Task RemoveMemberAsAdminAsync(int clubId, int membershipId)
            => RemoveMemberCoreAsync(clubId, membershipId);

        // ── Core logic ────────────────────────────────────────────────────

        private async Task<MemberDto> AddMemberCoreAsync(int clubId, AddMemberDto dto)
        {
            await EnsureClubExistsAsync(clubId);

            if (await _db.Users.FindAsync(dto.UserId) == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng.");

            var alreadyMember = await _db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId && m.UserId == dto.UserId && m.Status == "Active");
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
                Status = "Active"
            };

            _db.ClubMemberships.Add(membership);
            await _db.SaveChangesAsync();

            var clubName = await _db.Clubs.Where(c => c.Id == clubId).Select(c => c.Name).FirstAsync();
            await _notifications.SendAsync(dto.UserId,
                "Được thêm vào CLB",
                $"Bạn đã được thêm vào CLB {clubName} với vai trò {dto.ClubRole}.",
                "System");

            return await GetByIdAsync(clubId, membership.Id);
        }

        private async Task<MemberDto> UpdateMemberCoreAsync(int clubId, int membershipId, UpdateMemberDto dto)
        {
            var membership = await _db.ClubMemberships
                .FirstOrDefaultAsync(m => m.ClubId == clubId && m.Id == membershipId)
                ?? throw new KeyNotFoundException("Không tìm thấy thành viên này trong CLB.");

            if (dto.DepartmentId.HasValue)
                await EnsureDepartmentBelongsToClubAsync(clubId, dto.DepartmentId.Value);

            membership.ClubRole = dto.ClubRole;
            membership.DepartmentId = dto.DepartmentId;
            await _db.SaveChangesAsync();

            return await GetByIdAsync(clubId, membershipId);
        }

        private async Task RemoveMemberCoreAsync(int clubId, int membershipId)
        {
            var membership = await _db.ClubMemberships
                .FirstOrDefaultAsync(m => m.ClubId == clubId && m.Id == membershipId)
                ?? throw new KeyNotFoundException("Không tìm thấy thành viên này trong CLB.");

            if (membership.Status == "Resigned")
                throw new InvalidOperationException("Thành viên này đã rời CLB.");

            membership.Status = "Resigned";
            await _db.SaveChangesAsync();

            var clubName = await _db.Clubs.Where(c => c.Id == membership.ClubId).Select(c => c.Name).FirstAsync();
            await _notifications.SendAsync(membership.UserId,
                "Rời khỏi CLB",
                $"Bạn đã được ghi nhận rời khỏi CLB {clubName}.",
                "System");
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
                m.ClubId == clubId &&
                m.UserId == userId &&
                m.ClubRole == "CLUB_ADMIN" &&
                m.Status == "Active");

            if (!isClubAdmin)
                throw new UnauthorizedAccessException("Bạn không có quyền quản lý thành viên trong CLB này.");
        }

        private async Task EnsureDepartmentBelongsToClubAsync(int clubId, int departmentId)
        {
            if (!await _db.Departments.AnyAsync(d => d.Id == departmentId && d.ClubId == clubId))
                throw new KeyNotFoundException("Ban không thuộc CLB này.");
        }

        private static MemberDto ToDto(ClubMembership m) => new()
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
            Status = m.Status
        };
    }
}
