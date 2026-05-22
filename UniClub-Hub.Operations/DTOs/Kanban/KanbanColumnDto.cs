namespace UniClub_Hub.Operations.DTOs.Kanban
{
    public class KanbanColumnDto
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? SprintId { get; set; }
        public string Name { get; set; } = null!;
        public string? Color { get; set; }
        public int SortOrder { get; set; }
        public int TaskCount { get; set; }
    }

    public class CreateKanbanColumnDto
    {
        public string Name { get; set; } = null!;
        public string? Color { get; set; }
        public int? SprintId { get; set; }
        public int? SortOrder { get; set; }
    }

    public class UpdateKanbanColumnDto
    {
        public string Name { get; set; } = null!;
        public string? Color { get; set; }
        public int SortOrder { get; set; }
    }

    public class ReorderKanbanColumnsDto
    {
        public List<int> OrderedIds { get; set; } = [];
    }
}
