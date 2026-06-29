using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Post
{
    public class PostResponse
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string Title { get; set; } = "";
        public string Content { get; set; } = "";
        public string? ThumbnailUrl { get; set; }
        public string Category { get; set; } = "";
        public string Status { get; set; } = "Draft";
        public string? ReviewNote { get; set; }
        public string? ReviewerName { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public string AuthorId { get; set; } = "";
        public string AuthorName { get; set; } = "";
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
    }

    public class PostListResponse
    {
        public IEnumerable<PostResponse> Data { get; set; } = [];
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class CreatePostRequest
    {
        public string Title { get; set; } = "";
        public string Content { get; set; } = "";
        public PostCategory Category { get; set; } = PostCategory.News;
        public bool PublishDirectly { get; set; } = false;
        public int? DepartmentId { get; set; }
    }

    public class UpdatePostRequest
    {
        public string Title { get; set; } = "";
        public string Content { get; set; } = "";
        public PostCategory Category { get; set; } = PostCategory.News;
        public int? DepartmentId { get; set; }
    }

    public class ReviewPostRequest
    {
        public string? ReviewNote { get; set; }
    }
}
