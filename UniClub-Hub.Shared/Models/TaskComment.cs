using UniClub_Hub.Shared.Common;
namespace UniClub_Hub.Shared.Models
{
    public class TaskComment
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string UserId { get; set; } = null!;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ClubTask? Task { get; set; }
        public ApplicationUser? User { get; set; }
    }
}
