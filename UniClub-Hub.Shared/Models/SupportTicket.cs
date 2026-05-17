namespace UniClub_Hub.Shared.Models
{
    public class SupportTicket
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public string Subject { get; set; } = null!;
        public string Message { get; set; } = null!;
        public string Status { get; set; } = "Open"; // Open | InProgress | Resolved
        public string? AdminNote { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }

        public ApplicationUser User { get; set; } = null!;
    }
}
