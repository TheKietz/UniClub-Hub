using Microsoft.AspNetCore.Identity;

namespace UniClub_Hub.Shared.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? StudentId { get; set; }
        public string? FullName { get; set; }
        public string? Major { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Phone { get; set; }

        public ICollection<ClubMembership>? ClubMemberships { get; set; }
        public ICollection<Notification>? Notifications { get; set; }
    }
}
