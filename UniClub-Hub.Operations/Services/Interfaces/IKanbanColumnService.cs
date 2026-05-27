using UniClub_Hub.Operations.DTOs.Kanban;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface IKanbanColumnService
    {
        Task<List<KanbanColumnDto>> GetByClubAsync(int clubId, int? sprintId);
        Task<KanbanColumnDto> GetByIdAsync(int id);
        Task<KanbanColumnDto> CreateAsync(int clubId, CreateKanbanColumnDto dto, string createdBy);
        Task<KanbanColumnDto> UpdateAsync(int id, UpdateKanbanColumnDto dto);
        Task DeleteAsync(int id);
        Task ReorderAsync(int clubId, ReorderKanbanColumnsDto dto);
        Task EnsureDefaultColumnsAsync(int clubId);
    }
}
