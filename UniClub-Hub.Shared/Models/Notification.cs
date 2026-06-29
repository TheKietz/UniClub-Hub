using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    public class Notification
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Message { get; set; } = null!;
        public NotificationType Type { get; set; } = NotificationType.System;
        public bool IsRead { get; set; } = false;
        public string? Link { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ApplicationUser User { get; set; } = null!;
    }
}
