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
        public async Task<PagedResult<SprintDto>> GetByClubAsync(int clubId, int? departmentId, int? eventId, int page, int pageSize)
        {
            var query = db.Sprints
                .AsNoTracking()
                .Where(s => s.ClubId == clubId && s.IsDeleted == false);

            if (eventId.HasValue)
                query = query.Where(s => s.EventId == eventId);

            if (departmentId.HasValue)
                query = query.Where(s => s.DepartmentId == departmentId || s.DepartmentId == null);

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
                    DepartmentId = s.DepartmentId,
                    Name = s.Name,
                    Goal = s.Goal,
                    StartDate = s.StartDate.ToUniversalTime(),
                    EndDate = s.EndDate.ToUniversalTime()   ,
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

        public async Task<SprintDto> CreateAsync(int clubId, CreateSprintDto dto, string userId)
        {
            await RequireManagerRoleAsync(userId, clubId);

            var sprint = new Sprint
            {
                ClubId = clubId,
                EventId = dto.EventId,
                DepartmentId = dto.DepartmentId,
                Name = dto.Name,
                Goal = dto.Goal,
                StartDate = dto.StartDate.ToUniversalTime(),
                EndDate = dto.EndDate.ToUniversalTime(),
                Status = SprintStatus.Planning,
                CreatedBy = userId
            };

            db.Sprints.Add(sprint);
            await db.SaveChangesAsync();
            return MapToDto(sprint);
        }

        public async Task<SprintDto> UpdateAsync(int id, UpdateSprintDto dto, string userId)
        {
            var sprint = await db.Sprints.FindAsync(id)
                ?? throw new KeyNotFoundException($"Sprint {id} not found.");

            await RequireMemberAsync(userId, sprint.ClubId);

            sprint.Name = dto.Name;
            sprint.Goal = dto.Goal;
            sprint.StartDate = dto.StartDate.ToUniversalTime();
            sprint.EndDate = dto.EndDate.ToUniversalTime();
            sprint.Status = dto.Status;
            sprint.EventId = dto.EventId;

            await db.SaveChangesAsync();
            return MapToDto(sprint);
        }

        public async Task DeleteAsync(int id, string userId)
        {
            var sprint = await db.Sprints.FindAsync(id)
                ?? throw new KeyNotFoundException($"Sprint {id} not found.");

            await RequireManagerRoleAsync(userId, sprint.ClubId);

            db.Sprints.Remove(sprint);
            await db.SaveChangesAsync();
        }

        // DEPT_LEAD or CLUB_ADMIN only.
        private async Task RequireManagerRoleAsync(string userId, int clubId)
        {
            // 1 user có thể có nhiều dòng membership trong cùng CLB — xét mọi dòng Active
            var isManager = await db.ClubMemberships
                .AsNoTracking()
                .AnyAsync(m =>
                    m.UserId == userId &&
                    m.ClubId == clubId &&
                    m.Status == MembershipStatus.Active &&
                    (m.ClubRole == ClubRole.DEPT_LEAD || m.ClubRole == ClubRole.CLUB_ADMIN));

            if (!isManager)
            {
                throw new UnauthorizedAccessException("Chỉ Trưởng ban hoặc Quản lý CLB mới có quyền thực hiện thao tác này.");
            }
        }

        // Any active club member (MEMBER, DEPT_LEAD, or CLUB_ADMIN).
        private async Task RequireMemberAsync(string userId, int clubId)
        {
            var isMember = await db.ClubMemberships
                .AsNoTracking()
                .AnyAsync(m =>
                    m.UserId == userId &&
                    m.ClubId == clubId &&
                    m.Status == MembershipStatus.Active);

            if (!isMember)
                throw new UnauthorizedAccessException("Bạn không phải thành viên hoạt động của câu lạc bộ này.");
        }

        private static SprintDto MapToDto(Sprint s) => new()
        {
            Id = s.Id,
            ClubId = s.ClubId,
            EventId = s.EventId,
            DepartmentId = s.DepartmentId,
            Name = s.Name,
            Goal = s.Goal,
            StartDate = s.StartDate.ToUniversalTime(),
            EndDate = s.EndDate.ToUniversalTime(),
            Status = s.Status,
            CreatedAt = s.CreatedAt,
            TaskCount = s.Tasks?.Count ?? 0
        };
    }
}
