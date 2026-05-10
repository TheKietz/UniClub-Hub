using UniClub_Hub.Shared.Common;
namespace UniClub_Hub.Shared.Models
{
    public class Post
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string AuthorId { get; set; } = null!;
        public int? DepartmentId { get; set; }
        public string Title { get; set; } = null!;
        public string Content { get; set; } = null!; // HTML / Markdown
        public string? ThumbnailUrl { get; set; }
        public string Category { get; set; } = "News"; // News / Announcement
        public bool IsPublished { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Club Club { get; set; } = null!;
        public ApplicationUser Author { get; set; } = null!;
        public Department? Department { get; set; }
    }
}
