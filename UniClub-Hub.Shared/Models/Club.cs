namespace UniClub_Hub.Shared.Models
{
    public class Club
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Code { get; set; } = null!;
        public int? CategoryId { get; set; }
        public string? LogoUrl { get; set; }
        public string? Description { get; set; }
        public string? ContactInfo { get; set; }
        public DateOnly? EstablishedDate { get; set; }
        public string Status { get; set; } = "Active";
        public string? AdvisorName { get; set; }
        public string? FormSchema { get; set; } // JSONB — cấu trúc form tuyển thành viên

        public Category? Category { get; set; }
        public LandingPage? LandingPage { get; set; }
        public ICollection<Department>? Departments { get; set; }
        public ICollection<ClubMembership>? ClubMemberships { get; set; }
        public ICollection<Post>? Posts { get; set; }
        public ICollection<ClubEvent>? Events { get; set; }
        public ICollection<ClubApplication>? Applications { get; set; }
        public ICollection<Contribution>? Contributions { get; set; }
        public ICollection<MediaGallery>? MediaGalleries { get; set; }
    }
}
