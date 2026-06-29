using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Kanban;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class KanbanColumnService(UniClubDbContext db) : IKanbanColumnService
    {
        // The 4 fixed system columns, in display order. Each maps to an exact status.
        private static readonly (string Name, string Color, ClubTaskStatus Status)[] DefaultColumns =
        [
            ("Cần làm",    "#6b7280", ClubTaskStatus.Todo),
            ("Đang làm",   "#3b82f6", ClubTaskStatus.Doing),
            ("Reviewing",  "#8b5cf6", ClubTaskStatus.Reviewing),
            ("Hoàn thành", "#10b981", ClubTaskStatus.Done),
        ];

        public async Task<List<KanbanColumnDto>> GetByClubAsync(int clubId, int? sprintId, int? departmentId)
        {
            await EnsureDefaultColumnsAsync(clubId, departmentId);

            var query = db.KanbanColumns
                .AsNoTracking()
                .Where(c => c.ClubId == clubId);

            if (sprintId.HasValue)
                query = query.Where(c => c.SprintId == sprintId || c.SprintId == null);
            else
                query = query.Where(c => c.SprintId == null);

            query = query.Where(c => c.DepartmentId == departmentId);

            return await query
                .OrderBy(c => c.SortOrder)
                .Select(c => new KanbanColumnDto
                {
                    Id = c.Id,
                    ClubId = c.ClubId,
                    SprintId = c.SprintId,
                    DepartmentId = c.DepartmentId,
                    Name = c.Name,
                    Color = c.Color,
                    SortOrder = c.SortOrder,
                    Status = c.Status,
                    IsSystem = c.IsSystem,
                })
                .ToListAsync();
        }

        public async Task<KanbanColumnDto> GetByIdAsync(int id)
        {
            var col = await db.KanbanColumns.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id)
                ?? throw new KeyNotFoundException($"Column {id} not found.");

            return MapToDto(col);
        }

        public async Task<KanbanColumnDto> CreateAsync(int clubId, CreateKanbanColumnDto dto, string createdBy)
        {
            var maxOrder = await db.KanbanColumns
                .Where(c => c.ClubId == clubId && c.SprintId == dto.SprintId)
                .MaxAsync(c => (int?)c.SortOrder) ?? -1;

            var col = new KanbanColumn
            {
                ClubId = clubId,
                SprintId = dto.SprintId,
                DepartmentId = dto.DepartmentId,
                Name = dto.Name,
                Color = dto.Color,
                SortOrder = dto.SortOrder ?? maxOrder + 1,
                // Custom columns are never system; default their mapped status to Doing.
                Status = dto.Status ?? ClubTaskStatus.Doing,
                IsSystem = false,
                CreatedBy = createdBy,
            };

            db.KanbanColumns.Add(col);
            await db.SaveChangesAsync();
            return MapToDto(col);
        }

        public async Task<KanbanColumnDto> UpdateAsync(int id, UpdateKanbanColumnDto dto)
        {
            var col = await db.KanbanColumns.FindAsync(id)
                ?? throw new KeyNotFoundException($"Column {id} not found.");

            // System columns: name is locked, but color/order may still change.
            if (col.IsSystem && !string.Equals(dto.Name, col.Name, StringComparison.Ordinal))
                throw new InvalidOperationException("Không thể đổi tên cột mặc định.");

            if (!col.IsSystem)
                col.Name = dto.Name;
            col.Color = dto.Color;
            col.SortOrder = dto.SortOrder;

            await db.SaveChangesAsync();
            return MapToDto(col);
        }

        public async Task DeleteAsync(int id)
        {
            var col = await db.KanbanColumns.FindAsync(id)
                ?? throw new KeyNotFoundException($"Column {id} not found.");

            if (col.IsSystem)
                throw new InvalidOperationException("Không thể xóa cột mặc định.");

            db.KanbanColumns.Remove(col);
            await db.SaveChangesAsync();
        }

        public async Task ReorderAsync(int clubId, ReorderKanbanColumnsDto dto)
        {
            var cols = await db.KanbanColumns
                .Where(c => c.ClubId == clubId && dto.OrderedIds.Contains(c.Id))
                .ToListAsync();

            for (int i = 0; i < dto.OrderedIds.Count; i++)
            {
                var col = cols.FirstOrDefault(c => c.Id == dto.OrderedIds[i]);
                if (col != null) col.SortOrder = i;
            }

            await db.SaveChangesAsync();
        }

        public async Task EnsureDefaultColumnsAsync(int clubId, int? departmentId)
        {
            var existing = await db.KanbanColumns
                .Where(c =>
                    c.ClubId == clubId &&
                    c.SprintId == null &&
                    c.DepartmentId == departmentId)
                .ToListAsync();

            // Fresh board → seed all 4 system columns.
            if (existing.Count == 0)
            {
                for (int i = 0; i < DefaultColumns.Length; i++)
                {
                    db.KanbanColumns.Add(new KanbanColumn
                    {
                        ClubId = clubId,
                        DepartmentId = departmentId,
                        Name = DefaultColumns[i].Name,
                        Color = DefaultColumns[i].Color,
                        SortOrder = i,
                        Status = DefaultColumns[i].Status,
                        IsSystem = true,
                    });
                }

                await db.SaveChangesAsync();
                return;
            }

            // Existing board → upgrade: backfill Status/IsSystem on the known
            // default columns by name, and insert any missing system column
            // (e.g. the newly-added "Reviewing").
            var changed = false;
            for (int i = 0; i < DefaultColumns.Length; i++)
            {
                var def = DefaultColumns[i];
                var match = existing.FirstOrDefault(c =>
                    string.Equals(c.Name, def.Name, StringComparison.Ordinal));

                if (match is null)
                {
                    // Shift any column sitting at/after this slot down by one
                    // so the new system column drops into its intended position.
                    foreach (var c in existing.Where(c => c.SortOrder >= i))
                        c.SortOrder += 1;

                    db.KanbanColumns.Add(new KanbanColumn
                    {
                        ClubId = clubId,
                        DepartmentId = departmentId,
                        Name = def.Name,
                        Color = def.Color,
                        SortOrder = i,
                        Status = def.Status,
                        IsSystem = true,
                    });
                    changed = true;
                }
                else if (!match.IsSystem || match.Status != def.Status)
                {
                    match.IsSystem = true;
                    match.Status = def.Status;
                    changed = true;
                }
            }

            if (changed) await db.SaveChangesAsync();
        }

        private static KanbanColumnDto MapToDto(KanbanColumn c) => new()
        {
            Id = c.Id,
            ClubId = c.ClubId,
            SprintId = c.SprintId,
            DepartmentId = c.DepartmentId,
            Name = c.Name,
            Color = c.Color,
            SortOrder = c.SortOrder,
            Status = c.Status,
            IsSystem = c.IsSystem,
        };
    }
}
