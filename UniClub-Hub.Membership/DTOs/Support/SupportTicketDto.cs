namespace UniClub_Hub.Membership.DTOs.Support
{
    public class CreateSupportTicketDto
    {
        public string Subject { get; set; } = null!;
        public string Message { get; set; } = null!;
    }

    public class UpdateTicketStatusDto
    {
        public string Status { get; set; } = null!; // Open | InProgress | Resolved
        public string? AdminNote { get; set; }
    }

    public class SupportTicketDto
    {
        public int Id { get; set; }
        public string Subject { get; set; } = null!;
        public string Message { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string? AdminNote { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string UserId { get; set; } = null!;
        public string UserFullName { get; set; } = null!;
        public string UserEmail { get; set; } = null!;
    }
}
