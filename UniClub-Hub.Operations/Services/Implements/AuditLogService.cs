using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.AuditLog;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class AuditLogService(UniClubDbContext db) : IAuditLogService
    {
        // Maps frontend module names → EF entity class names stored in AuditLog.EntityName
        private static readonly Dictionary<string, string> ModuleToEntity = new()
        {
            { "Tasks",   "ClubTask" },
            { "Events",  "ClubEvent" },
            { "Sprints", "Sprint" },
        };

        private static readonly Dictionary<string, string> EntityToModule =
            ModuleToEntity.ToDictionary(kv => kv.Value, kv => kv.Key);

        public async Task<PagedResult<AuditLogDto>> GetByClubAsync(
            int clubId,
            string? module,
            int page,
            int pageSize)
        {
            // Resolve all entity IDs that belong to this club for each supported entity type
            var taskIds   = await db.Tasks.Where(t => t.ClubId == clubId).Select(t => t.Id.ToString()).ToListAsync();
            var eventIds  = await db.Events.Where(e => e.ClubId == clubId).Select(e => e.Id.ToString()).ToListAsync();
            var sprintIds = await db.Sprints.Where(s => s.ClubId == clubId).Select(s => s.Id.ToString()).ToListAsync();

            var query = db.AuditLogs.AsNoTracking()
                .Where(a =>
                    (a.EntityName == "ClubTask"  && taskIds.Contains(a.EntityId)) ||
                    (a.EntityName == "ClubEvent" && eventIds.Contains(a.EntityId)) ||
                    (a.EntityName == "Sprint"    && sprintIds.Contains(a.EntityId)));

            // Optional module filter
            if (!string.IsNullOrEmpty(module) && ModuleToEntity.TryGetValue(module, out var entityName))
                query = query.Where(a => a.EntityName == entityName);

            var total = await query.CountAsync();

            var logs = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            if (logs.Count == 0)
                return new PagedResult<AuditLogDto> { Items = [], TotalCount = 0, Page = page, PageSize = pageSize };

            // Resolve user display names
            var userIds = logs
                .Where(l => l.UserId != null)
                .Select(l => l.UserId!)
                .Distinct()
                .ToList();

            var users = await db.Users
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName, u.AvatarUrl })
                .ToDictionaryAsync(u => u.Id);

            // Resolve entity titles for affected records (Tasks, Events, Sprints)
            var taskTitleMap = await db.Tasks
                .Where(t => t.ClubId == clubId)
                .Select(t => new { Id = t.Id.ToString(), t.Title })
                .ToDictionaryAsync(t => t.Id, t => t.Title);

            var eventTitleMap = await db.Events
                .Where(e => e.ClubId == clubId)
                .Select(e => new { Id = e.Id.ToString(), e.Name })
                .ToDictionaryAsync(e => e.Id, e => e.Name);

            var sprintTitleMap = await db.Sprints
                .Where(s => s.ClubId == clubId)
                .Select(s => new { Id = s.Id.ToString(), s.Name })
                .ToDictionaryAsync(s => s.Id, s => s.Name);

            var dtos = logs.Select(l =>
            {
                users.TryGetValue(l.UserId ?? string.Empty, out var user);

                var entityTitle = l.EntityName switch
                {
                    "ClubTask"  => taskTitleMap.GetValueOrDefault(l.EntityId),
                    "ClubEvent" => eventTitleMap.GetValueOrDefault(l.EntityId),
                    "Sprint"    => sprintTitleMap.GetValueOrDefault(l.EntityId),
                    _           => null,
                };

                return new AuditLogDto
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

            return new PagedResult<AuditLogDto>
            {
                Items      = dtos,
                TotalCount = total,
                Page       = page,
                PageSize   = pageSize,
            };
        }
    }
}
