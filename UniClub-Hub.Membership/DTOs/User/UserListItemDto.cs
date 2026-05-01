namespace UniClub_Hub.Membership.DTOs.User
{
    public class UserListItemDto
    {
        public string Id { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? FullName { get; set; }
        public string? StudentId { get; set; }
        public string? Major { get; set; }
        public string? AvatarUrl { get; set; }
        public bool IsLocked { get; set; }
    }
}
