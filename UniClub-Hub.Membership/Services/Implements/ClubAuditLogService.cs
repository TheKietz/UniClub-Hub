using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.AuditLog;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ClubAuditLogService(UniClubDbContext db) : IClubAuditLogService
    {
        private static readonly Dictionary<string, string> EntityToModule = new()
        {
            { "Club",            "CLB" },
            { "ClubMembership",  "Thành viên" },
            { "Department",      "Ban bộ phận" },
            { "ClubApplication", "Đơn đăng ký" },
        };

        public async Task<PagedResult<ClubAuditLogDto>> GetByClubAsync(
            int clubId, string? module, int page, int pageSize)
        {
            var membershipIds = await db.ClubMemberships
                .Where(m => m.ClubId == clubId)
                .Select(m => m.Id.ToString())
                .ToListAsync();

            var departmentIds = await db.Departments
                .Where(d => d.ClubId == clubId)
                .Select(d => d.Id.ToString())
                .ToListAsync();

            var applicationIds = await db.Applications
                .Where(a => a.ClubId == clubId)
                .Select(a => a.Id.ToString())
                .ToListAsync();

            var clubIdStr = clubId.ToString();

            var query = db.AuditLogs.AsNoTracking().Where(a =>
                (a.EntityName == "Club"            && a.EntityId == clubIdStr) ||
                (a.EntityName == "ClubMembership"  && membershipIds.Contains(a.EntityId)) ||
                (a.EntityName == "Department"      && departmentIds.Contains(a.EntityId)) ||
                (a.EntityName == "ClubApplication" && applicationIds.Contains(a.EntityId)));

            if (!string.IsNullOrEmpty(module) && EntityToModule.ContainsValue(module))
            {
                var entityName = EntityToModule.First(kv => kv.Value == module).Key;
                query = query.Where(a => a.EntityName == entityName);
            }

            var total = await query.CountAsync();
            var logs = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            if (logs.Count == 0)
                return new PagedResult<ClubAuditLogDto> { Items = [], TotalCount = 0, Page = page, PageSize = pageSize };

            var userIds = logs.Where(l => l.UserId != null).Select(l => l.UserId!).Distinct().ToList();
            var users = await db.Users
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName, u.AvatarUrl })
                .ToDictionaryAsync(u => u.Id);

            var membershipTitleMap = await db.ClubMemberships
                .Where(m => m.ClubId == clubId)
                .Include(m => m.User)
                .Select(m => new { Id = m.Id.ToString(), Name = m.User.FullName ?? m.User.Email })
                .ToDictionaryAsync(m => m.Id, m => m.Name);

            var departmentTitleMap = await db.Departments
                .Where(d => d.ClubId == clubId)
                .Select(d => new { Id = d.Id.ToString(), d.Name })
                .ToDictionaryAsync(d => d.Id, d => d.Name);

            var applicationTitleMap = await db.Applications
                .Where(a => a.ClubId == clubId)
                .Include(a => a.User)
                .Select(a => new { Id = a.Id.ToString(), Name = a.User.FullName ?? a.User.Email })
                .ToDictionaryAsync(a => a.Id, a => a.Name);

            var clubName = await db.Clubs
                .Where(c => c.Id == clubId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync();

            var dtos = logs.Select(l =>
            {
                users.TryGetValue(l.UserId ?? string.Empty, out var user);

                var entityTitle = l.EntityName switch
                {
                    "Club"            => clubName,
                    "ClubMembership"  => membershipTitleMap.GetValueOrDefault(l.EntityId),
                    "Department"      => departmentTitleMap.GetValueOrDefault(l.EntityId),
                    "ClubApplication" => applicationTitleMap.GetValueOrDefault(l.EntityId),
                    _                 => null,
                };

                return new ClubAuditLogDto
                {
                    Id            = l.Id,
                    UserId        = l.UserId,
                    UserName      = user?.FullName ?? "Hệ thống",
                    UserAvatarUrl = user?.AvatarUrl,
                    Action        = l.Action.ToString(),
                    Module        = EntityToModule.GetValueOrDefault(l.EntityName, l.EntityName),
                    EntityId      = l.EntityId,
                    EntityTitle   = entityTitle,
                    OldValue      = l.OldValue,
                    NewValue      = l.NewValue,
                    Timestamp     = l.Timestamp,
                };
            }).ToList();

            return new PagedResult<ClubAuditLogDto> { Items = dtos, TotalCount = total, Page = page, PageSize = pageSize };
        }
    }
}
