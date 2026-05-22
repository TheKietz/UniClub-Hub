using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Event;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class EventService(UniClubDbContext db) : IEventService
    {
        public async Task<PagedResult<EventDto>> GetAllAsync(int clubId, string? status, string? search, int page, int pageSize)
        {
            var query = db.Events
                .AsNoTracking()
                .Where(e => e.ClubId == clubId);

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
                    ClubId = e.ClubId,
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

            return MapToDto(e);
        }

        public async Task<EventDto> CreateAsync(int clubId, CreateEventDto dto, string createdBy)
        {
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
                CreatedBy = createdBy
            };

            db.Events.Add(ev);
            await db.SaveChangesAsync();
            return MapToDto(ev);
        }

        public async Task<EventDto> UpdateAsync(int id, UpdateEventDto dto)
        {
            var ev = await db.Events.FindAsync(id)
                ?? throw new KeyNotFoundException($"Event {id} not found.");

            ev.Name = dto.Name;
            ev.Description = dto.Description;
            ev.Location = dto.Location;
            ev.BannerUrl = dto.BannerUrl;
            ev.StartTime = dto.StartTime;
            ev.EndTime = dto.EndTime;
            ev.MaxParticipants = dto.MaxParticipants;
            ev.Status = dto.Status;
            ev.Budget = dto.Budget;
            ev.Category = dto.Category;

            await db.SaveChangesAsync();
            return MapToDto(ev);
        }

        public async Task DeleteAsync(int id)
        {
            var ev = await db.Events.FindAsync(id)
                ?? throw new KeyNotFoundException($"Event {id} not found.");

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

        public async Task<EventSessionDto> AddSessionAsync(int eventId, CreateEventSessionDto dto)
        {
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

        public async Task DeleteSessionAsync(int eventId, int sessionId)
        {
            var session = await db.EventSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.EventId == eventId)
                ?? throw new KeyNotFoundException($"Session {sessionId} not found in event {eventId}.");

            db.EventSessions.Remove(session);
            await db.SaveChangesAsync();
        }

        public async Task ReorderSessionsAsync(int eventId, List<int> orderedIds)
        {
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

        public async Task<EventStaffDto> AssignStaffAsync(int eventId, AssignEventStaffDto dto)
        {
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

        public async Task RemoveStaffAsync(int eventId, string userId)
        {
            var staff = await db.EventStaff
                .FirstOrDefaultAsync(es => es.EventId == eventId && es.UserId == userId)
                ?? throw new KeyNotFoundException($"Staff {userId} not found in event {eventId}.");

            db.EventStaff.Remove(staff);
            await db.SaveChangesAsync();
        }

        // ── Mapping helpers ──────────────────────────────────────────────────

        private static EventDto MapToDto(ClubEvent e) => new()
        {
            Id = e.Id,
            ClubId = e.ClubId,
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
    }
}
