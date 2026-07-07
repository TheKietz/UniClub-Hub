using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    public class Post
    {
        public int Id { get; set; }
        /// <summary>Null = tin cấp trường (school-level news, managed by SUPER_ADMIN).</summary>
        public int? ClubId { get; set; }
        public string AuthorId { get; set; } = null!;
        public int? DepartmentId { get; set; }
        public string Title { get; set; } = null!;
        public string Content { get; set; } = null!;
        public string? ThumbnailUrl { get; set; }
        public PostCategory Category { get; set; } = PostCategory.News;
        public PostStatus Status { get; set; } = PostStatus.Draft;
        public string? ReviewNote { get; set; }
        public string? ReviewerId { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Club? Club { get; set; }
        public ApplicationUser Author { get; set; } = null!;
        public Department? Department { get; set; }
        public ApplicationUser? Reviewer { get; set; }
    }
}
