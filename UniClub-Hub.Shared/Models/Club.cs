using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    public class Club : IAuditable, ISoftDeletable
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Code { get; set; } = null!;
        public int? CategoryId { get; set; }
        public string? LogoUrl { get; set; }
        public string? Description { get; set; }
        public string? ContactInfo { get; set; }
        public DateOnly? EstablishedDate { get; set; }
        public ClubStatus Status { get; set; } = ClubStatus.Active;
        public string? AdvisorName { get; set; }
        public string? FormSchema { get; set; } // JSON
        public string? MemberFieldSchema { get; set; } // JSON — custom profile fields per club

        // IAuditable
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        // ISoftDeletable
        public bool IsDeleted { get; set; } = false;
        public string? DeletedBy { get; set; }

        public Category? Category { get; set; }
        public LandingPage? LandingPage { get; set; }
        public ICollection<Department>? Departments { get; set; }
        public ICollection<ClubMembership>? ClubMemberships { get; set; }
        public ICollection<Post>? Posts { get; set; }
        public ICollection<ClubEvent>? Events { get; set; }
        public ICollection<ClubApplication>? Applications { get; set; }
        public ICollection<Contribution>? Contributions { get; set; }
        public ICollection<MediaGallery>? MediaGalleries { get; set; }
        public ICollection<ClubPipelineStage>? PipelineStages { get; set; }
    }
}
