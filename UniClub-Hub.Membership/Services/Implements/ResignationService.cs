using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Resignation;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ResignationService : IResignationService
    {
        private readonly UniClubDbContext _db;
        private readonly INotificationService _notifications;

        public ResignationService(UniClubDbContext db, INotificationService notifications)
        {
            _db = db;
            _notifications = notifications;
        }

        public async Task<ResignationRequestDto> SubmitAsync(int clubId, string userId, SubmitResignationDto dto)
        {
            var membership = await _db.ClubMemberships
                .Include(m => m.User)
                .FirstOrDefaultAsync(m =>
                    m.ClubId == clubId && m.UserId == userId &&
                    (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                ?? throw new InvalidOperationException("Bạn không phải thành viên của CLB này.");

            if (membership.ClubRole != ClubRole.CLUB_ADMIN && membership.ClubRole != ClubRole.DEPT_LEAD)
                throw new InvalidOperationException("Chỉ Trưởng CLB hoặc Trưởng ban mới cần gửi đơn từ chức.");

            var hasPending = await _db.ResignationRequests.AnyAsync(r =>
                r.MembershipId == membership.Id && r.Status == ResignationStatus.Pending);
            if (hasPending)
                throw new InvalidOperationException("Bạn đã có đơn từ chức đang chờ duyệt.");

            var request = new ResignationRequest
            {
                UserId = userId,
                ClubId = clubId,
                MembershipId = membership.Id,
                Preference = dto.Preference,
                Status = ResignationStatus.Pending,
                RequestedAt = DateTime.UtcNow,
            };
            _db.ResignationRequests.Add(request);
            await _db.SaveChangesAsync();

            var clubName = await _db.Clubs.Where(c => c.Id == clubId).Select(c => c.Name).FirstAsync();

            // Thông báo cho người duyệt
            if (membership.ClubRole == ClubRole.CLUB_ADMIN)
            {
                // Thông báo tất cả SUPER_ADMIN
                var superAdminIds = await _db.UserRoles
                    .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, r.Name })
                    .Where(x => x.Name == "SUPER_ADMIN")
                    .Select(x => x.UserId)
                    .ToListAsync();
                foreach (var adminId in superAdminIds)
                    await _notifications.SendAsync(adminId, "Đơn từ chức Trưởng CLB",
                        $"{membership.User.FullName ?? membership.User.Email} đã gửi đơn từ chức tại CLB {clubName}.",
                        NotificationType.System);
            }
            else // DEPT_LEAD
            {
                var clubAdminIds = await _db.ClubMemberships
                    .Where(m => m.ClubId == clubId && m.ClubRole == ClubRole.CLUB_ADMIN && m.Status == MembershipStatus.Active)
                    .Select(m => m.UserId).ToListAsync();
                foreach (var adminId in clubAdminIds)
                    await _notifications.SendAsync(adminId, "Đơn từ chức Trưởng ban",
                        $"{membership.User.FullName ?? membership.User.Email} đã gửi đơn từ chức tại CLB {clubName}.",
                        NotificationType.System);
            }

            return await ToDto(request, membership, clubName, null);
        }

        public async Task<ResignationRequestDto?> GetMyRequestAsync(int clubId, string userId)
        {
            var r = await _db.ResignationRequests
                .Include(r => r.Club)
                .Include(r => r.Membership)
                .Where(r => r.ClubId == clubId && r.UserId == userId)
                .OrderByDescending(r => r.RequestedAt)
                .FirstOrDefaultAsync();
            if (r == null) return null;

            string? reviewerName = r.ReviewerId == null ? null :
                await _db.Users.Where(u => u.Id == r.ReviewerId).Select(u => u.FullName ?? u.Email).FirstOrDefaultAsync();
            return ToDto(r, reviewerName);
        }

        public async Task<IEnumerable<ResignationRequestDto>> GetAllMyRequestsAsync(string userId)
        {
            var requests = await _db.ResignationRequests
                .Include(r => r.Club)
                .Include(r => r.Membership)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            var reviewerIds = requests.Where(r => r.ReviewerId != null).Select(r => r.ReviewerId!).Distinct().ToList();
            var reviewers = reviewerIds.Any()
                ? await _db.Users.Where(u => reviewerIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u.FullName ?? u.Email ?? u.Id)
                : new Dictionary<string, string>();

            return requests.Select(r => ToDto(r, r.ReviewerId != null ? reviewers.GetValueOrDefault(r.ReviewerId) : null));
        }

        public async Task<IEnumerable<ResignationRequestDto>> GetByClubAsync(int clubId)
        {
            // Trả về đơn của DEPT_LEAD trong CLB
            var requests = await _db.ResignationRequests
                .Include(r => r.Club)
                .Include(r => r.Membership).ThenInclude(m => m.User)
                .Where(r => r.ClubId == clubId && r.Membership.ClubRole == ClubRole.DEPT_LEAD)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            return requests.Select(r => ToDtoWithUser(r));
        }

        public async Task<IEnumerable<ResignationRequestDto>> GetAllClubAdminRequestsAsync()
        {
            var requests = await _db.ResignationRequests
                .Include(r => r.Club)
                .Include(r => r.Membership).ThenInclude(m => m.User)
                .Where(r => r.Membership.ClubRole == ClubRole.CLUB_ADMIN)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            return requests.Select(r => ToDtoWithUser(r));
        }

        public async Task<ResignationRequestDto> ReviewAsync(int requestId, ReviewResignationDto dto, string reviewerId)
        {
            if (dto.Status == ResignationStatus.Pending)
                throw new ArgumentException("Trạng thái duyệt không hợp lệ.");

            var request = await _db.ResignationRequests
                .Include(r => r.Club)
                .Include(r => r.Membership)
                .FirstOrDefaultAsync(r => r.Id == requestId)
                ?? throw new KeyNotFoundException("Không tìm thấy đơn từ chức.");

            if (request.Status != ResignationStatus.Pending)
                throw new InvalidOperationException("Đơn này đã được xử lý.");

            request.Status = dto.Status;
            request.ReviewNote = dto.ReviewNote;
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewerId = reviewerId;

            if (dto.Status == ResignationStatus.Approved)
            {
                var membership = await _db.ClubMemberships.FindAsync(request.MembershipId)!;
                if (request.Preference == ResignationPreference.LeaveClub)
                {
                    membership!.Status = MembershipStatus.Resigned;
                    membership.ResignedDate = DateOnly.FromDateTime(DateTime.UtcNow);
                }
                else // BecomeMember
                {
                    membership!.ClubRole = ClubRole.MEMBER;
                    membership.DepartmentId = null;
                }
            }

            await _db.SaveChangesAsync();

            // Thông báo cho người gửi đơn
            var (title, msg) = dto.Status == ResignationStatus.Approved
                ? ("Đơn từ chức được duyệt",
                    request.Preference == ResignationPreference.LeaveClub
                        ? $"Đơn từ chức của bạn tại CLB {request.Club.Name} đã được chấp thuận. Bạn đã rời CLB."
                        : $"Đơn từ chức của bạn tại CLB {request.Club.Name} đã được chấp thuận. Bạn đã trở thành thành viên thường.")
                : ("Đơn từ chức bị từ chối",
                    $"Đơn từ chức của bạn tại CLB {request.Club.Name} đã bị từ chối.");
            await _notifications.SendAsync(request.UserId, title, msg, NotificationType.System);

            string? reviewerName = await _db.Users.Where(u => u.Id == reviewerId)
                .Select(u => u.FullName ?? u.Email).FirstOrDefaultAsync();
            return ToDto(request, reviewerName);
        }

        // ── Helpers ───────────────────────────────────────────────────────

        private static Task<ResignationRequestDto> ToDto(
            ResignationRequest r, ClubMembership m, string clubName, string? reviewerName)
            => Task.FromResult(new ResignationRequestDto
            {
                Id = r.Id,
                ClubId = r.ClubId,
                ClubName = clubName,
                MembershipId = r.MembershipId,
                ClubRole = m.ClubRole.ToString(),
                Preference = r.Preference,
                Status = r.Status,
                RequestedAt = r.RequestedAt,
                ReviewedAt = r.ReviewedAt,
                ReviewNote = r.ReviewNote,
                ReviewerName = reviewerName,
            });

        private static ResignationRequestDto ToDto(ResignationRequest r, string? reviewerName) =>
            new()
            {
                Id = r.Id,
                ClubId = r.ClubId,
                ClubName = r.Club?.Name ?? "",
                MembershipId = r.MembershipId,
                ClubRole = r.Membership?.ClubRole.ToString() ?? "",
                Preference = r.Preference,
                Status = r.Status,
                RequestedAt = r.RequestedAt,
                ReviewedAt = r.ReviewedAt,
                ReviewNote = r.ReviewNote,
                ReviewerName = reviewerName,
            };

        private static ResignationRequestDto ToDtoWithUser(ResignationRequest r) =>
            new()
            {
                Id = r.Id,
                ClubId = r.ClubId,
                ClubName = r.Club?.Name ?? "",
                MembershipId = r.MembershipId,
                ClubRole = r.Membership?.ClubRole.ToString() ?? "",
                Preference = r.Preference,
                Status = r.Status,
                RequestedAt = r.RequestedAt,
                ReviewedAt = r.ReviewedAt,
                ReviewNote = r.ReviewNote,
                UserId = r.UserId,
                FullName = r.Membership?.User?.FullName,
                Email = r.Membership?.User?.Email ?? "",
                StudentId = r.Membership?.User?.StudentId,
            };
    }
}
