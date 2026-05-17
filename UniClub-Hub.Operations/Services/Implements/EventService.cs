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
        public async Task<PagedResult<EventDto>> GetAllAsync(int clubId, string? status, int page, int pageSize)
        {
            var query = db.Events
                .AsNoTracking()
                .Where(e => e.ClubId == clubId);

            if (Enum.TryParse<EventStatus>(status, true, out var parsedStatus))
                query = query.Where(e => e.Status == parsedStatus);

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
            ParticipantCount = e.Registrations?.Count ?? 0,
            CreatedAt = e.CreatedAt,
            CreatedBy = e.CreatedBy
        };
    }
}
