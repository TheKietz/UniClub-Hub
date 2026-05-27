using System.ComponentModel.DataAnnotations;
using UniClub_Hub.Shared.Common;
using System.ComponentModel.DataAnnotations.Schema;
using UniClub_Hub.Shared.Enums;
namespace UniClub_Hub.Shared.Models
{
    [Table("TaskAssignees")]
    public class TaskAssignee
    {
        [Key]
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string UserId { get; set; } = null!;
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public string? AssignedBy { get; set; }

        public ClubTask Task { get; set; } = null!;
        public ApplicationUser User { get; set; } = null!;
    }
}
