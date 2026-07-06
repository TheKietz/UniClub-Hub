using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.DTOs.Application;
using UniClub_Hub.Membership.DTOs.Pipeline;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Email;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ApplicationService : IApplicationService
    {
        private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        private readonly UniClubDbContext _db;
        private readonly IEmailService _email;
        private readonly IConfiguration _config;
        private readonly ISystemSettingService _settings;
        private readonly INotificationDispatchService _dispatch;
        private readonly IClubPermissionService _permissions;
        private readonly IClubMembershipService _membershipService;

        public ApplicationService(UniClubDbContext db, IEmailService email, IConfiguration config,
            ISystemSettingService settings, INotificationDispatchService dispatch,
            IClubPermissionService permissions, IClubMembershipService membershipService)
        {
            _db = db;
            _email = email;
            _config = config;
            _settings = settings;
            _dispatch = dispatch;
            _permissions = permissions;
            _membershipService = membershipService;
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
                .Include(a => a.CurrentStage)
                .Where(a => a.ClubId == clubId);

            if (
                !string.IsNullOrEmpty(status)
                && Enum.TryParse<ApplicationStatus>(status, true, out var parsedStatus)
            )
                query = query.Where(a => a.Status == parsedStatus);

            var apps = await query.ToListAsync();

            // Lấy tên reviewer trong 1 query (tránh N+1)
            var reviewerIds = apps.Where(a => a.ReviewerId != null)
                                  .Select(a => a.ReviewerId!).Distinct().ToList();
            var reviewers = reviewerIds.Any()
                ? await _db.Users.Where(u => reviewerIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u.FullName ?? u.Email ?? u.Id)
                : new Dictionary<string, string>();

            return apps.Select(a => ToAdminDto(a,
                a.ReviewerId != null ? reviewers.GetValueOrDefault(a.ReviewerId) : null));
        }

        public async Task<PagedResult<AdminApplicationDto>> GetAllByClubPageAsync(int clubId, ApplicationListQuery request)
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");

            var page = Math.Max(1, request.Page);
            var pageSize = Math.Clamp(request.PageSize, 1, 100);
            var query = _db
                .Applications.AsNoTracking()
                .Include(a => a.Club)
                .Include(a => a.User)
                .Include(a => a.CurrentStage)
                .Where(a => a.ClubId == clubId);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLower();
                query = query.Where(a =>
                    (a.User.FullName != null && a.User.FullName.ToLower().Contains(s)) ||
                    (a.User.Email != null && a.User.Email.ToLower().Contains(s)) ||
                    (a.User.StudentId != null && a.User.StudentId.ToLower().Contains(s)) ||
                    (a.CurrentStage != null && a.CurrentStage.Name.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(request.Status) &&
                Enum.TryParse<ApplicationStatus>(request.Status, true, out var parsedStatus))
                query = query.Where(a => a.Status == parsedStatus);

            if (request.StageId.HasValue)
                query = query.Where(a => a.CurrentStageId == request.StageId);

            if (request.DateFrom.HasValue)
                query = query.Where(a => a.AppliedAt >= request.DateFrom.Value.Date);

            if (request.DateTo.HasValue)
            {
                var nextDay = request.DateTo.Value.Date.AddDays(1);
                query = query.Where(a => a.AppliedAt < nextDay);
            }

            var sortBy = request.SortBy.Trim().ToLower();
            var desc = request.SortDir.Equals("desc", StringComparison.OrdinalIgnoreCase);
            var orderedQuery = sortBy switch
            {
                "name" => desc ? query.OrderByDescending(a => a.User.FullName ?? a.User.Email) : query.OrderBy(a => a.User.FullName ?? a.User.Email),
                "email" => desc ? query.OrderByDescending(a => a.User.Email) : query.OrderBy(a => a.User.Email),
                "status" => desc ? query.OrderByDescending(a => a.Status) : query.OrderBy(a => a.Status),
                "stage" => desc ? query.OrderByDescending(a => a.CurrentStage != null ? a.CurrentStage.Name : "") : query.OrderBy(a => a.CurrentStage != null ? a.CurrentStage.Name : ""),
                _ => desc ? query.OrderByDescending(a => a.AppliedAt) : query.OrderBy(a => a.AppliedAt),
            };
            query = orderedQuery.ThenBy(a => a.Id);

            var totalCount = await query.CountAsync();
            var apps = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var reviewerIds = apps.Where(a => a.ReviewerId != null)
                                  .Select(a => a.ReviewerId!).Distinct().ToList();
            var reviewers = reviewerIds.Any()
                ? await _db.Users.Where(u => reviewerIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u.FullName ?? u.Email ?? u.Id)
                : new Dictionary<string, string>();

            return new PagedResult<AdminApplicationDto>
            {
                Items = apps.Select(a => ToAdminDto(a,
                    a.ReviewerId != null ? reviewers.GetValueOrDefault(a.ReviewerId) : null)).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
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
                m.ClubId == clubId
                && m.UserId == userId
                && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation)
            );
            if (isMember)
                throw new InvalidOperationException("Bạn đã là thành viên của CLB này.");

            var hasPending = await _db.Applications.AnyAsync(a =>
                a.ClubId == clubId
                && a.UserId == userId
                && (
                    a.Status == ApplicationStatus.Pending
                    || a.Status == ApplicationStatus.Interview
                    || a.Status == ApplicationStatus.Reviewing
                )
            );
            if (hasPending)
                throw new InvalidOperationException("Bạn đang có đơn chờ duyệt cho CLB này.");

            var application = new ClubApplication
            {
                UserId = userId,
                ClubId = clubId,
                Answers = dto.Answers is { Count: > 0 }
                    ? JsonSerializer.Serialize(dto.Answers, _jsonOpts)
                    : null,
                MemberFieldData = dto.MemberFieldData is { Count: > 0 }
                    ? JsonSerializer.Serialize(dto.MemberFieldData, _jsonOpts)
                    : null,
                Status = ApplicationStatus.Pending,
                AppliedAt = DateTime.UtcNow,
            };

            _db.Applications.Add(application);
            await _db.SaveChangesAsync();

            var clubName = await _db.Clubs.Where(c => c.Id == clubId).Select(c => c.Name).FirstAsync();
            var applicantName = await _db.Users.Where(u => u.Id == userId)
                .Select(u => u.FullName ?? u.Email ?? userId).FirstOrDefaultAsync() ?? userId;

            await _dispatch.FireAsync(NotificationTriggers.ApplicationSubmitted, clubId, new()
            {
                ["clubName"] = clubName,
                ["userName"] = applicantName,
            });

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

            await _permissions.EnsureHasPermissionAsync(
                clubId, reviewerId, isSuperAdmin, ClubPermissions.ApplicationsReview);

            var application =
                await _db.Applications.FirstOrDefaultAsync(a =>
                    a.Id == applicationId && a.ClubId == clubId
                ) ?? throw new KeyNotFoundException("Không tìm thấy đơn ứng tuyển.");

            if (application.Status is ApplicationStatus.Accepted or ApplicationStatus.Rejected)
                throw new InvalidOperationException(
                    "Đơn này đã được xử lý xong, không thể thay đổi."
                );

            await using var tx = await _db.Database.BeginTransactionAsync();

            application.Status = dto.Status;
            application.ReviewNote = dto.ReviewNote;
            application.ReviewedAt = DateTime.UtcNow;
            application.ReviewerId = reviewerId;
            if (dto.Status is ApplicationStatus.Accepted or ApplicationStatus.Rejected)
                application.CurrentStageId = null;

            if (dto.Status == ApplicationStatus.Accepted)
            {
                var alreadyMember = await _db.ClubMemberships.AnyAsync(m =>
                    m.ClubId == application.ClubId
                    && m.UserId == application.UserId
                    && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation)
                );

                if (!alreadyMember)
                {
                    await _membershipService.EnsureMemberCapacityAsync(application.ClubId);

                    _db.ClubMemberships.Add(
                        new ClubMembership
                        {
                            UserId = application.UserId,
                            ClubId = application.ClubId,
                            ClubRole = UniClub_Hub.Shared.Enums.ClubRole.MEMBER,
                            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                            Status = MembershipStatus.Probation,
                            MemberCustomData = application.MemberFieldData,
                        }
                    );
                }
            }

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            var clubName = await _db.Clubs.Where(c => c.Id == clubId).Select(c => c.Name).FirstAsync();

            var triggerKey = dto.Status switch
            {
                ApplicationStatus.Interview => NotificationTriggers.ApplicationInterview,
                ApplicationStatus.Accepted  => NotificationTriggers.ApplicationAccepted,
                ApplicationStatus.Rejected  => NotificationTriggers.ApplicationRejected,
                _                           => NotificationTriggers.ApplicationInterview,
            };

            // In-app notification (controlled by preferences)
            await _dispatch.FireAsync(triggerKey, clubId, new()
            {
                ["applicantUserId"] = application.UserId,
                ["clubName"] = clubName,
            });

            // Email (controlled by preferences)
            var applicant = await _db.Users.FindAsync(application.UserId);
            if (applicant?.Email != null
                && await _dispatch.IsEmailEnabledAsync(triggerKey, NotificationRecipientRoles.TargetUser, clubId))
            {
                try
                {
                    var appUrl = _config["AppUrl"] ?? "https://localhost:54610";
                    var logoUrl = await _settings.GetValueAsync("system.logo_url");
                    var html = EmailTemplates.ApplicationResult(
                        applicant.FullName ?? applicant.Email,
                        clubName,
                        dto.Status.ToString(),
                        dto.ReviewNote,
                        $"{appUrl}/my-activity",
                        logoUrl
                    );
                    var subject = dto.Status switch
                    {
                        ApplicationStatus.Interview => $"Mời phỏng vấn – {clubName}",
                        ApplicationStatus.Accepted  => $"Đơn được chấp nhận – {clubName}",
                        ApplicationStatus.Rejected  => $"Kết quả đơn đăng ký – {clubName}",
                        _                           => $"Cập nhật đơn đăng ký – {clubName}"
                    };
                    await _email.SendAsync(applicant.Email, subject, html);
                }
                catch { /* Không block nếu email thất bại */ }
            }

            // Khi Accepted → membership đã được tạo trong transaction ở trên

            var app = await _db.Applications.AsNoTracking()
                .Include(a => a.Club).Include(a => a.User).Include(a => a.CurrentStage)
                .Where(a => a.Id == applicationId)
                .FirstAsync();

            string? reviewerName = null;
            if (app.ReviewerId != null)
                reviewerName = await _db.Users.Where(u => u.Id == app.ReviewerId)
                    .Select(u => u.FullName ?? u.Email)
                    .FirstOrDefaultAsync();

            return ToAdminDto(app, reviewerName);
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
                ReviewNote = a.ReviewNote,
            };

        private static AdminApplicationDto ToAdminDto(ClubApplication a, string? reviewerName = null) =>
            new()
            {
                Id = a.Id,
                ClubId = a.ClubId,
                ClubName = a.Club?.Name ?? "",
                Status = a.Status,
                AppliedAt = a.AppliedAt,
                ReviewNote = a.ReviewNote,
                ReviewedAt = a.ReviewedAt,
                ReviewerName = reviewerName,
                UserId = a.UserId,
                FullName = a.User?.FullName ?? a.User?.Email ?? "",
                Email = a.User?.Email ?? "",
                StudentId = a.User?.StudentId,
                Answers = a.Answers,
                MemberFieldData = a.MemberFieldData,
                CurrentStageId = a.CurrentStageId,
                CurrentStageName = a.CurrentStage?.Name,
            };

        public async Task<AdminApplicationDto> AdvanceStageAsync(
            int clubId, int applicationId, AdvanceApplicationRequest req,
            string reviewerId, bool isSuperAdmin)
        {
            await _permissions.EnsureHasPermissionAsync(
                clubId, reviewerId, isSuperAdmin, ClubPermissions.ApplicationsReview);

            var application = await _db.Applications
                .Include(a => a.CurrentStage)
                .FirstOrDefaultAsync(a => a.Id == applicationId && a.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy đơn ứng tuyển.");

            if (application.Status is ApplicationStatus.Accepted or ApplicationStatus.Rejected)
                throw new InvalidOperationException("Đơn này đã được xử lý xong, không thể thay đổi.");

            var stages = await _db.ClubPipelineStages
                .Where(s => s.ClubId == clubId && s.IsActive)
                .OrderBy(s => s.StageOrder)
                .ToListAsync();

            if (!stages.Any())
                throw new InvalidOperationException("CLB chưa cấu hình quy trình tuyển dụng.");

            UniClub_Hub.Shared.Models.ClubPipelineStage nextStage;
            if (application.CurrentStageId == null)
            {
                nextStage = stages.First();
            }
            else
            {
                var currentIdx = stages.FindIndex(s => s.Id == application.CurrentStageId);
                if (currentIdx == -1)
                    throw new InvalidOperationException(
                        "Vòng tuyển hiện tại của đơn không còn hợp lệ. Vui lòng xử lý đơn thủ công.");
                if (currentIdx >= stages.Count - 1)
                    throw new InvalidOperationException("Đơn đang ở vòng cuối. Vui lòng chọn Duyệt hoặc Từ chối.");
                nextStage = stages[currentIdx + 1];
            }

            application.CurrentStageId = nextStage.Id;
            application.Status = ApplicationStatus.Reviewing;
            application.ReviewNote = req.ReviewNote;
            application.ReviewedAt = DateTime.UtcNow;
            application.ReviewerId = reviewerId;
            await _db.SaveChangesAsync();

            var updated = await _db.Applications.AsNoTracking()
                .Include(a => a.Club).Include(a => a.User).Include(a => a.CurrentStage)
                .Where(a => a.Id == applicationId)
                .FirstAsync();

            string? reviewerName = null;
            if (updated.ReviewerId != null)
                reviewerName = await _db.Users.Where(u => u.Id == updated.ReviewerId)
                    .Select(u => u.FullName ?? u.Email).FirstOrDefaultAsync();

            return ToAdminDto(updated, reviewerName);
        }
    }
}
