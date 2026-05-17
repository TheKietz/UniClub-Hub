using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Sprint;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class SprintService(UniClubDbContext db) : ISprintService
    {
        public async Task<PagedResult<SprintDto>> GetByClubAsync(int clubId, int? eventId, int page, int pageSize)
        {
            var query = db.Sprints
                .AsNoTracking()
                .Where(s => s.ClubId == clubId);

            if (eventId.HasValue)
                query = query.Where(s => s.EventId == eventId);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(s => s.StartDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new SprintDto
                {
                    Id = s.Id,
                    ClubId = s.ClubId,
                    EventId = s.EventId,
                    Name = s.Name,
                    Goal = s.Goal,
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt,
                    TaskCount = s.Tasks != null ? s.Tasks.Count : 0
                })
                .ToListAsync();

            return new PagedResult<SprintDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<SprintDto> GetByIdAsync(int id)
        {
            var sprint = await db.Sprints
                .AsNoTracking()
                .Include(s => s.Tasks)
                .FirstOrDefaultAsync(s => s.Id == id)
                ?? throw new KeyNotFoundException($"Sprint {id} not found.");

            return MapToDto(sprint);
        }

        public async Task<SprintDto> CreateAsync(int clubId, CreateSprintDto dto, string createdBy)
        {
            var sprint = new Sprint
            {
                ClubId = clubId,
                EventId = dto.EventId,
                Name = dto.Name,
                Goal = dto.Goal,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = SprintStatus.Planning,
                CreatedBy = createdBy
            };

            db.Sprints.Add(sprint);
            await db.SaveChangesAsync();
            return MapToDto(sprint);
        }

        public async Task<SprintDto> UpdateAsync(int id, UpdateSprintDto dto)
        {
            var sprint = await db.Sprints.FindAsync(id)
                ?? throw new KeyNotFoundException($"Sprint {id} not found.");

            sprint.Name = dto.Name;
            sprint.Goal = dto.Goal;
            sprint.StartDate = dto.StartDate;
            sprint.EndDate = dto.EndDate;
            sprint.Status = dto.Status;
            sprint.EventId = dto.EventId;

            await db.SaveChangesAsync();
            return MapToDto(sprint);
        }

        public async Task DeleteAsync(int id)
        {
            var sprint = await db.Sprints.FindAsync(id)
                ?? throw new KeyNotFoundException($"Sprint {id} not found.");

            db.Sprints.Remove(sprint);
            await db.SaveChangesAsync();
        }

        private static SprintDto MapToDto(Sprint s) => new()
        {
            Id = s.Id,
            ClubId = s.ClubId,
            EventId = s.EventId,
            Name = s.Name,
            Goal = s.Goal,
            StartDate = s.StartDate,
            EndDate = s.EndDate,
            Status = s.Status,
            CreatedAt = s.CreatedAt,
            TaskCount = s.Tasks?.Count ?? 0
        };
    }
}
