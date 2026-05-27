using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.DTOs.Kanban;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class KanbanColumnService(UniClubDbContext db) : IKanbanColumnService
    {
        private static readonly (string Name, string Color)[] DefaultColumns =
        [
            ("Cần làm", "#6b7280"),
            ("Đang làm", "#3b82f6"),
            ("Hoàn thành", "#10b981"),
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
            var hasAny = await db.KanbanColumns.AnyAsync(c =>
                c.ClubId == clubId &&
                c.SprintId == null &&
                c.DepartmentId == departmentId);
            if (hasAny) return;

            for (int i = 0; i < DefaultColumns.Length; i++)
            {
                db.KanbanColumns.Add(new KanbanColumn
                {
                    ClubId = clubId,
                    DepartmentId = departmentId,
                    Name = DefaultColumns[i].Name,
                    Color = DefaultColumns[i].Color,
                    SortOrder = i,
                });
            }

            await db.SaveChangesAsync();
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
        };
    }
}
