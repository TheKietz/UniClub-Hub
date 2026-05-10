using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Application;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ApplicationService : IApplicationService
    {
        private readonly UniClubDbContext _db;
        private readonly INotificationService _notifications;

        public ApplicationService(UniClubDbContext db, INotificationService notifications)
        {
            _db = db;
            _notifications = notifications;
        }

        public async Task<IEnumerable<ApplicationDto>> GetMyApplicationsAsync(string userId)
        {
            return await _db
                .Applications.AsNoTracking()
                .Include(a => a.Club)
                .Where(a => a.UserId == userId)
                .Select(a => ToDto(a))
                .ToListAsync();
        }

        public async Task<IEnumerable<AdminApplicationDto>> GetAllByClubAsync(
            int clubId,
            string? status = null
        )
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");

            var query = _db
                .Applications.AsNoTracking()
                .Include(a => a.Club)
                .Include(a => a.User)
                .Where(a => a.ClubId == clubId);

            if (
                !string.IsNullOrEmpty(status)
                && Enum.TryParse<ApplicationStatus>(status, true, out var parsedStatus)
            )
                query = query.Where(a => a.Status == parsedStatus);

            return await query.Select(a => ToAdminDto(a)).ToListAsync();
        }

        public async Task<ApplicationDto> SubmitAsync(
            int clubId,
            string userId,
            SubmitApplicationDto dto
        )
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");

            var isMember = await _db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId && m.UserId == userId && m.Status == MembershipStatus.Active
            );
            if (isMember)
                throw new InvalidOperationException("Bạn đã là thành viên của CLB này.");

            var hasPending = await _db.Applications.AnyAsync(a =>
                a.ClubId == clubId
                && a.UserId == userId
                && (
                    a.Status == ApplicationStatus.Pending || a.Status == ApplicationStatus.Interview
                )
            );
            if (hasPending)
                throw new InvalidOperationException("Bạn đang có đơn chờ duyệt cho CLB này.");

            var application = new ClubApplication
            {
                UserId = userId,
                ClubId = clubId,
                Answers = dto.Answers,
                Status = ApplicationStatus.Pending,
                AppliedAt = DateTime.UtcNow,
            };

            _db.Applications.Add(application);
            await _db.SaveChangesAsync();

            // Thông báo cho tất cả CLUB_ADMIN của CLB
            var clubName = await _db
                .Clubs.Where(c => c.Id == clubId)
                .Select(c => c.Name)
                .FirstAsync();
            var adminIds = await _db
                .ClubMemberships.Where(m =>
                    m.ClubId == clubId
                    && m.ClubRole == UniClub_Hub.Shared.Enums.ClubRole.CLUB_ADMIN
                    && m.Status == MembershipStatus.Active
                )
                .Select(m => m.UserId)
                .ToListAsync();

            foreach (var adminId in adminIds)
                await _notifications.SendAsync(
                    adminId,
                    "Đơn đăng ký mới",
                    $"Có đơn đăng ký mới vào CLB {clubName}.",
                    NotificationType.Application
                );

            return await _db
                .Applications.AsNoTracking()
                .Include(a => a.Club)
                .Where(a => a.Id == application.Id)
                .Select(a => ToDto(a))
                .FirstAsync();
        }

        public async Task<AdminApplicationDto> ReviewAsync(
            int clubId,
            int applicationId,
            ReviewApplicationDto dto,
            string reviewerId,
            bool isSuperAdmin
        )
        {
            var validStatuses = new[]
            {
                ApplicationStatus.Interview,
                ApplicationStatus.Accepted,
                ApplicationStatus.Rejected,
            };
            if (!validStatuses.Contains(dto.Status))
                throw new ArgumentException(
                    "Trạng thái không hợp lệ. Chỉ chấp nhận: Interview, Accepted, Rejected."
                );

            var application =
                await _db.Applications.FirstOrDefaultAsync(a =>
                    a.Id == applicationId && a.ClubId == clubId
                ) ?? throw new KeyNotFoundException("Không tìm thấy đơn ứng tuyển.");

            if (application.Status is ApplicationStatus.Accepted or ApplicationStatus.Rejected)
                throw new InvalidOperationException(
                    "Đơn này đã được xử lý xong, không thể thay đổi."
                );

            if (!isSuperAdmin)
            {
                var isClubAdmin = await _db.ClubMemberships.AnyAsync(m =>
                    m.ClubId == clubId
                    && m.UserId == reviewerId
                    && m.ClubRole == UniClub_Hub.Shared.Enums.ClubRole.CLUB_ADMIN
                    && m.Status == MembershipStatus.Active
                );

                if (!isClubAdmin)
                    throw new UnauthorizedAccessException(
                        "Bạn không có quyền duyệt đơn của CLB này."
                    );
            }

            application.Status = dto.Status;
            await _db.SaveChangesAsync();

            // Thông báo cho người nộp đơn
            var clubName = await _db
                .Clubs.Where(c => c.Id == clubId)
                .Select(c => c.Name)
                .FirstAsync();
            var (title, message) = dto.Status switch
            {
                ApplicationStatus.Interview => (
                    "Mời phỏng vấn",
                    $"Đơn đăng ký vào CLB {clubName} của bạn được mời phỏng vấn."
                ),
                ApplicationStatus.Accepted => (
                    "Đơn được chấp nhận",
                    $"Chúc mừng! Bạn đã được chấp nhận vào CLB {clubName}."
                ),
                ApplicationStatus.Rejected => (
                    "Đơn bị từ chối",
                    $"Đơn đăng ký vào CLB {clubName} của bạn đã bị từ chối."
                ),
                _ => ("Cập nhật đơn", $"Đơn đăng ký vào CLB {clubName} của bạn đã được cập nhật."),
            };
            await _notifications.SendAsync(
                application.UserId,
                title,
                message,
                NotificationType.Application
            );

            // Khi Accepted → tự động tạo ClubMembership
            if (dto.Status == ApplicationStatus.Accepted)
            {
                var alreadyMember = await _db.ClubMemberships.AnyAsync(m =>
                    m.ClubId == application.ClubId
                    && m.UserId == application.UserId
                    && m.Status == MembershipStatus.Active
                );

                if (!alreadyMember)
                {
                    _db.ClubMemberships.Add(
                        new ClubMembership
                        {
                            UserId = application.UserId,
                            ClubId = application.ClubId,
                            ClubRole = UniClub_Hub.Shared.Enums.ClubRole.MEMBER,
                            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                            Status = MembershipStatus.Active,
                        }
                    );
                    await _db.SaveChangesAsync();
                }
            }

            return await _db
                .Applications.AsNoTracking()
                .Include(a => a.Club)
                .Include(a => a.User)
                .Where(a => a.Id == applicationId)
                .Select(a => ToAdminDto(a))
                .FirstAsync();
        }

        // ── Helpers ───────────────────────────────────────────────────────

        private static ApplicationDto ToDto(ClubApplication a) =>
            new()
            {
                Id = a.Id,
                ClubId = a.ClubId,
                ClubName = a.Club?.Name ?? "",
                Status = a.Status,
                AppliedAt = a.AppliedAt,
            };

        private static AdminApplicationDto ToAdminDto(ClubApplication a) =>
            new()
            {
                Id = a.Id,
                ClubId = a.ClubId,
                ClubName = a.Club?.Name ?? "",
                Status = a.Status,
                AppliedAt = a.AppliedAt,
                UserId = a.UserId,
                FullName = a.User?.FullName ?? a.User?.Email ?? "",
                Email = a.User?.Email ?? "",
                StudentId = a.User?.StudentId,
                Answers = a.Answers,
            };
    }
}
