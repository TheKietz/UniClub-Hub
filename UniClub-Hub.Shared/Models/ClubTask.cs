using UniClub_Hub.Shared.Common;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniClub_Hub.Shared.Models
{
    [Table("Tasks")]
    public class ClubTask
    {
        [Key]
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? EventId { get; set; }
        public int? DepartmentId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string Priority { get; set; } = "Medium"; // Low / Medium / High
        public DateTime? Deadline { get; set; }
        public string Status { get; set; } = "Todo"; // Todo / Doing / Done
        public int Progress { get; set; } = 0; // 0–100
        public string? AssignedTo { get; set; } // FK UserId
        public string? CreatedBy { get; set; } // FK UserId

        public Club Club { get; set; } = null!;
        public ClubEvent? Event { get; set; }
        public Department? Department { get; set; }
        public ApplicationUser? Assignee { get; set; }
        public ApplicationUser? Creator { get; set; }
        public ICollection<TaskAttachment>? Attachments { get; set; }
        public ICollection<Contribution>? Contributions { get; set; }
    }
}
