using UniClub_Hub.Shared.Common;
namespace UniClub_Hub.Shared.Models
{
    public class Notification
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Message { get; set; } = null!;
        public string Type { get; set; } = "System"; // Task / Event / Application / System
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ApplicationUser User { get; set; } = null!;
    }
}
