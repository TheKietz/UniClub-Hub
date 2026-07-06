using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Event;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class EventService(
        UniClubDbContext db,
        IFileStorageService fileStorage,
        UserManager<ApplicationUser> userManager,
        IKanbanHubNotifier kanbanNotifier) : IEventService
    {
        private static readonly string[] AllowedExtensions =
        [
            ".pdf", ".doc", ".docx", ".xls", ".xlsx",
            ".png", ".jpg", ".jpeg", ".webp",
            ".zip", ".rar",
        ];
        private static readonly long MaxFileSizeBytes = 20 * 1024 * 1024; // 20 MB

        public async Task<PagedResult<EventDto>> GetAllAsync(int? clubId, string? status, string? search, int page, int pageSize)
        {
            var query = db.Events
                .AsNoTracking()
                .Where(e => clubId == null ? e.ClubId == null : e.ClubId == clubId);

            if (Enum.TryParse<EventStatus>(status, true, out var parsedStatus))
                query = query.Where(e => e.Status == parsedStatus);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(e => e.Name.Contains(search));

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.StartTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new EventDto
                {
                    Id = e.Id,
                    ClubId = e.ClubId,   // null for university events
                    Name = e.Name,
                    Description = e.Description,
                    Location = e.Location,
                    BannerUrl = e.BannerUrl,
                    StartTime = e.StartTime,
                    EndTime = e.EndTime,
                    MaxParticipants = e.MaxParticipants,
                    Status = e.Status,
                    Budget = e.Budget,
                    Category = e.Category,
                    Summary = e.Summary,
                    ParticipantCount = e.Registrations != null ? e.Registrations.Count : 0,
                    CreatedAt = e.CreatedAt,
                    CreatedBy = e.CreatedBy
                })
                .ToListAsync();

            return new PagedResult<EventDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<EventDto> GetByIdAsync(int id)
        {
            var e = await db.Events
                .AsNoTracking()
                .Include(e => e.Registrations)
                .Include(e => e.Sessions!.OrderBy(s => s.SortOrder))
                .Include(e => e.Staff!).ThenInclude(es => es.User)
                .FirstOrDefaultAsync(e => e.Id == id)
                ?? throw new KeyNotFoundException($"Event {id} not found.");

            var regLink = await db.EventAttachments
                .AsNoTracking()
                .Where(a => a.EventId == id && a.ContentType == RegLinkContentType)
                .Select(a => a.FileUrl)
                .FirstOrDefaultAsync();

            var dto = MapToDto(e);
            dto.RegistrationLink = regLink;
            return dto;
        }

        public async Task<EventDto> CreateAsync(int? clubId, CreateEventDto dto, string actorId)
        {
            await RequireManagerRoleAsync(actorId, clubId);

            var ev = new ClubEvent
            {
                ClubId = clubId,
                Name = dto.Name,
                Description = dto.Description,
                Location = dto.Location,
                BannerUrl = dto.BannerUrl,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                MaxParticipants = dto.MaxParticipants,
                Budget = dto.Budget,
                Category = dto.Category,
                Status = EventStatus.Draft,
                CreatedBy = actorId
            };

            db.Events.Add(ev);
            await db.SaveChangesAsync();
            return MapToDto(ev);
        }

        public async Task<EventDto> UpdateAsync(int id, UpdateEventDto dto, string actorId)
        {
            var ev = await db.Events.FindAsync(id)
                ?? throw new KeyNotFoundException($"Event {id} not found.");

            await RequireManagerRoleAsync(actorId, ev.ClubId);

            var oldStatus = ev.Status;
            var newStatus = dto.Status;

            ev.Name = dto.Name;
            ev.Description = dto.Description;
            ev.Location = dto.Location;
            ev.BannerUrl = dto.BannerUrl;
            ev.StartTime = dto.StartTime;
            ev.EndTime = dto.EndTime;
            ev.MaxParticipants = dto.MaxParticipants;
            ev.Status = newStatus;
            ev.Budget = dto.Budget;
            ev.Category = dto.Category;
            ev.Summary = dto.Summary;

            // InProgress → Draft / Cancelled: cascade soft-delete all event tasks
            var cascadeClubId = ev.ClubId;
            var didCascade = false;
            if (oldStatus == EventStatus.InProgress &&
                (newStatus == EventStatus.Draft || newStatus == EventStatus.Cancelled) &&
                cascadeClubId.HasValue)
            {
                await db.Tasks
                    .Where(t => t.EventId == id && !t.IsDeleted)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(t => t.IsDeleted, true)
                        .SetProperty(t => t.DeletedBy, actorId));
                didCascade = true;
            }

            await db.SaveChangesAsync();

            if (didCascade)
                await kanbanNotifier.NotifyEventTasksCleanedAsync(cascadeClubId!.Value, id);

            return MapToDto(ev);
        }

        public async Task DeleteAsync(int id, string actorId)
        {
            var ev = await db.Events.FindAsync(id)
                ?? throw new KeyNotFoundException($"Event {id} not found.");

            await RequireManagerRoleAsync(actorId, ev.ClubId);

            db.Events.Remove(ev);
            await db.SaveChangesAsync();
        }

        // ── Sessions ────────────────────────────────────────────────────────

        public async Task<List<EventSessionDto>> GetSessionsAsync(int eventId)
        {
            var items = await db.EventSessions
                .AsNoTracking()
                .Where(s => s.EventId == eventId)
                .OrderBy(s => s.SortOrder)
                .ToListAsync();

            return items.Select(MapSessionToDto).ToList();
        }

        public async Task<EventSessionDto> AddSessionAsync(int eventId, CreateEventSessionDto dto, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var session = new EventSession
            {
                EventId = eventId,
                Title = dto.Title,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                Description = dto.Description,
                Location = dto.Location,
                SortOrder = dto.SortOrder,
                CreatedAt = DateTime.UtcNow
            };

            db.EventSessions.Add(session);
            await db.SaveChangesAsync();
            return MapSessionToDto(session);
        }

        public async Task DeleteSessionAsync(int eventId, int sessionId, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var session = await db.EventSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.EventId == eventId)
                ?? throw new KeyNotFoundException($"Session {sessionId} not found in event {eventId}.");

            db.EventSessions.Remove(session);
            await db.SaveChangesAsync();
        }

        public async Task ReorderSessionsAsync(int eventId, List<int> orderedIds, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var sessions = await db.EventSessions
                .Where(s => s.EventId == eventId && orderedIds.Contains(s.Id))
                .ToListAsync();

            for (var i = 0; i < orderedIds.Count; i++)
            {
                var session = sessions.FirstOrDefault(s => s.Id == orderedIds[i]);
                if (session != null) session.SortOrder = i;
            }

            await db.SaveChangesAsync();
        }

        // ── Staff ────────────────────────────────────────────────────────────

        public async Task<List<EventStaffDto>> GetStaffAsync(int eventId)
        {
            var items = await db.EventStaff
                .AsNoTracking()
                .Include(es => es.User)
                .Where(es => es.EventId == eventId)
                .ToListAsync();

            return items.Select(MapStaffToDto).ToList();
        }

        public async Task<EventStaffDto> AssignStaffAsync(int eventId, AssignEventStaffDto dto, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var existing = await db.EventStaff
                .FirstOrDefaultAsync(es => es.EventId == eventId && es.UserId == dto.UserId);

            if (existing != null)
                throw new InvalidOperationException("User is already assigned to this event.");

            var staff = new EventStaff
            {
                EventId = eventId,
                UserId = dto.UserId,
                Role = dto.Role,
                AssignedAt = DateTime.UtcNow
            };

            db.EventStaff.Add(staff);
            await db.SaveChangesAsync();

            await db.Entry(staff).Reference(s => s.User).LoadAsync();
            return MapStaffToDto(staff);
        }

        public async Task RemoveStaffAsync(int eventId, string userId, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var staff = await db.EventStaff
                .FirstOrDefaultAsync(es => es.EventId == eventId && es.UserId == userId)
                ?? throw new KeyNotFoundException($"Staff {userId} not found in event {eventId}.");

            db.EventStaff.Remove(staff);
            await db.SaveChangesAsync();
        }

        // ── Registrations ────────────────────────────────────────────────────

        public async Task<List<EventRegistrationDto>> GetRegistrationsAsync(int eventId)
        {
            var items = await db.EventRegistrations
                .AsNoTracking()
                .Include(er => er.User)
                .Where(er => er.EventId == eventId)
                .OrderBy(er => er.RegisteredAt)
                .ToListAsync();

            return items.Select(MapRegistrationToDto).ToList();
        }

        public async Task<EventRegistrationDto> RegisterMemberAsync(int eventId, RegisterMemberDto dto, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var existing = await db.EventRegistrations
                .FirstOrDefaultAsync(er => er.EventId == eventId && er.UserId == dto.UserId);

            if (existing != null)
                throw new InvalidOperationException("User is already registered for this event.");

            var reg = new EventRegistration
            {
                EventId = eventId,
                UserId = dto.UserId,
                Note = dto.Note,
                RegisteredAt = DateTimeOffset.UtcNow
            };

            db.EventRegistrations.Add(reg);
            await db.SaveChangesAsync();
            await db.Entry(reg).Reference(r => r.User).LoadAsync();
            return MapRegistrationToDto(reg);
        }

        public async Task RemoveRegistrationAsync(int eventId, string userId, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var reg = await db.EventRegistrations
                .FirstOrDefaultAsync(er => er.EventId == eventId && er.UserId == userId)
                ?? throw new KeyNotFoundException($"Registration not found.");

            db.EventRegistrations.Remove(reg);
            await db.SaveChangesAsync();
        }

        public async Task UpdateAttendanceAsync(int eventId, string userId, UpdateAttendanceDto dto, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var reg = await db.EventRegistrations
                .FirstOrDefaultAsync(er => er.EventId == eventId && er.UserId == userId)
                ?? throw new KeyNotFoundException($"Registration not found.");

            if (Enum.TryParse<AttendanceStatus>(dto.Attendance, true, out var status))
                reg.Attendance = status;

            if (status == AttendanceStatus.CheckedIn)
                reg.CheckedInAt ??= DateTimeOffset.UtcNow;

            if (dto.Note != null)
                reg.Note = dto.Note;

            await db.SaveChangesAsync();
        }

        // ── Attachments ──────────────────────────────────────────────────────

        private const string RegLinkContentType = "text/x-registration-link";

        public async Task<List<EventAttachmentDto>> GetAttachmentsAsync(int eventId)
        {
            var items = await db.EventAttachments
                .AsNoTracking()
                .Include(a => a.UploadedByUser)
                .Where(a => a.EventId == eventId && a.ContentType != RegLinkContentType)
                .OrderByDescending(a => a.UploadedAt)
                .ToListAsync();

            return items.Select(MapAttachmentToDto).ToList();
        }

        public async Task<string?> GetRegistrationLinkAsync(int eventId)
        {
            var att = await db.EventAttachments
                .AsNoTracking()
                .Where(a => a.EventId == eventId && a.ContentType == RegLinkContentType)
                .FirstOrDefaultAsync();
            return att?.FileUrl;
        }

        public async Task UpsertRegistrationLinkAsync(int eventId, string? url, string actorId)
        {
            var existing = await db.EventAttachments
                .Where(a => a.EventId == eventId && a.ContentType == RegLinkContentType)
                .FirstOrDefaultAsync();

            if (string.IsNullOrWhiteSpace(url))
            {
                if (existing != null) db.EventAttachments.Remove(existing);
            }
            else if (existing != null)
            {
                existing.FileUrl = url.Trim();
            }
            else
            {
                db.EventAttachments.Add(new EventAttachment
                {
                    EventId = eventId,
                    UploadedBy = actorId,
                    FileUrl = url.Trim(),
                    ContentType = RegLinkContentType,
                    UploadedAt = DateTimeOffset.UtcNow,
                });
            }

            await db.SaveChangesAsync();
        }

        public async Task<EventAttachmentDto> UploadAttachmentAsync(int eventId, IFormFile file, string? note, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                throw new InvalidOperationException($"Định dạng '{ext}' không được hỗ trợ. Chỉ chấp nhận: {string.Join(", ", AllowedExtensions)}");

            if (file.Length > MaxFileSizeBytes)
                throw new InvalidOperationException("Kích thước file vượt quá 20 MB.");

            var url = await fileStorage.UploadAsync(file, "events")
                ?? throw new InvalidOperationException("Không thể lưu file.");

            var attachment = new EventAttachment
            {
                EventId = eventId,
                UploadedBy = actorId,
                FileUrl = url,
                FileName = file.FileName,
                ContentType = file.ContentType,
                FileSize = file.Length,
                Note = note,
                UploadedAt = DateTimeOffset.UtcNow,
            };

            db.EventAttachments.Add(attachment);
            await db.SaveChangesAsync();
            await db.Entry(attachment).Reference(a => a.UploadedByUser).LoadAsync();
            return MapAttachmentToDto(attachment);
        }

        public async Task DeleteAttachmentAsync(int eventId, int attachmentId, string actorId)
        {
            var clubId = await GetEventClubIdAsync(eventId);
            await RequireManagerRoleAsync(actorId, clubId);

            var attachment = await db.EventAttachments
                .FirstOrDefaultAsync(a => a.Id == attachmentId && a.EventId == eventId)
                ?? throw new KeyNotFoundException("Tệp đính kèm không tồn tại.");

            db.EventAttachments.Remove(attachment);
            await db.SaveChangesAsync();
        }

        // ── Mapping helpers ──────────────────────────────────────────────────

        private static EventDto MapToDto(ClubEvent e) => new()
        {
            Id = e.Id,
            ClubId = e.ClubId,   // null for university events
            Name = e.Name,
            Description = e.Description,
            Location = e.Location,
            BannerUrl = e.BannerUrl,
            StartTime = e.StartTime,
            EndTime = e.EndTime,
            MaxParticipants = e.MaxParticipants,
            Status = e.Status,
            Budget = e.Budget,
            Category = e.Category,
            Summary = e.Summary,
            ParticipantCount = e.Registrations?.Count ?? 0,
            Sessions = e.Sessions?.Select(MapSessionToDto).ToList() ?? [],
            Staff = e.Staff?.Select(MapStaffToDto).ToList() ?? [],
            CreatedAt = e.CreatedAt,
            CreatedBy = e.CreatedBy
        };

        private static EventSessionDto MapSessionToDto(EventSession s) => new()
        {
            Id = s.Id,
            EventId = s.EventId,
            Title = s.Title,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            Description = s.Description,
            Location = s.Location,
            SortOrder = s.SortOrder
        };

        private static EventStaffDto MapStaffToDto(EventStaff es) => new()
        {
            Id = es.Id,
            EventId = es.EventId,
            UserId = es.UserId,
            UserName = es.User?.FullName ?? es.User?.UserName ?? es.UserId,
            AvatarUrl = es.User?.AvatarUrl,
            Role = es.Role,
            AssignedAt = es.AssignedAt
        };

        private static EventRegistrationDto MapRegistrationToDto(EventRegistration er) => new()
        {
            Id = er.Id,
            EventId = er.EventId,
            UserId = er.UserId,
            UserName = er.User?.FullName ?? er.User?.UserName ?? er.UserId,
            AvatarUrl = er.User?.AvatarUrl,
            Email = er.User?.Email,
            StudentId = er.User?.StudentId,
            RegisteredAt = er.RegisteredAt,
            Attendance = er.Attendance.ToString(),
            CheckedInAt = er.CheckedInAt,
            Note = er.Note
        };

        private static EventAttachmentDto MapAttachmentToDto(EventAttachment a) => new()
        {
            Id = a.Id,
            EventId = a.EventId,
            UploadedBy = a.UploadedBy,
            UploaderName = a.UploadedByUser?.FullName ?? a.UploadedByUser?.UserName ?? a.UploadedBy,
            FileUrl = a.FileUrl,
            FileName = a.FileName,
            ContentType = a.ContentType,
            FileSize = a.FileSize,
            Note = a.Note,
            UploadedAt = a.UploadedAt,
        };

        private async Task<int?> GetEventClubIdAsync(int eventId)
        {
            var ev = await db.Events
                .AsNoTracking()
                .Where(e => e.Id == eventId)
                .Select(e => new { e.Id, e.ClubId })
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Event {eventId} not found.");

            return ev.ClubId;
        }

        private async Task RequireManagerRoleAsync(string userId, int? clubId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user != null && await userManager.IsInRoleAsync(user, "SUPER_ADMIN")) return;

            if (clubId == null)
                throw new UnauthorizedAccessException("Chỉ Admin trường mới có thể quản lý sự kiện cấp trường.");

            var membership = await db.ClubMemberships
                .AsNoTracking()
                .FirstOrDefaultAsync(m =>
                    m.UserId == userId &&
                    m.ClubId == clubId &&
                    m.Status == MembershipStatus.Active);

            if (membership == null ||
                (membership.ClubRole != ClubRole.DEPT_LEAD && membership.ClubRole != ClubRole.CLUB_ADMIN))
            {
                throw new UnauthorizedAccessException("Chỉ Trưởng ban hoặc Quản lý CLB mới có quyền thực hiện thao tác này.");
            }
        }
    }
}
