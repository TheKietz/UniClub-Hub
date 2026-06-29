using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;

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

        // Exact task status this column represents — replaces name-based guessing.
        public ClubTaskStatus Status { get; set; } = ClubTaskStatus.Todo;

        // True for the 4 fixed columns (Cần làm / Đang làm / Reviewing / Hoàn thành):
        // they cannot be renamed or deleted.
        public bool IsSystem { get; set; }

        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        //department table
        public int? DepartmentId { get; set; }
        public Department? Department { get; set; }


        public Club Club { get; set; } = null!;
        public Sprint? Sprint { get; set; }
    }
}
