using Microsoft.AspNetCore.Identity;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Shared.Models
{
    public class ApplicationUser : IdentityUser, ISoftDeletable
    {
        public string? StudentId { get; set; }
        public string? FullName { get; set; }
        public string? Major { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Phone { get; set; }
        public string? Gender { get; set; }
        public DateOnly? DateOfBirth { get; set; }

        public bool IsDeleted { get; set; } = false;
        public string? DeletedBy { get; set; }

        public ICollection<ClubMembership>? ClubMemberships { get; set; }
        public ICollection<Notification>? Notifications { get; set; }
    }
}
