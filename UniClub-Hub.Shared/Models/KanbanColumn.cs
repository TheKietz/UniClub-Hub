using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Shared.Models
{
    public class KanbanColumn : IAuditable
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? SprintId { get; set; }
        public string Name { get; set; } = null!;
        public string? Color { get; set; }
        public int SortOrder { get; set; }

        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        public Club Club { get; set; } = null!;
        public Sprint? Sprint { get; set; }
    }
}
