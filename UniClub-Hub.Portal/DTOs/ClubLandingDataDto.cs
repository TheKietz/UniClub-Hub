using System.Text.Json;

namespace UniClub_Hub.Portal.DTOs
{
    // ── Root response ────────────────────────────────────────────────────────
    public class ClubLandingDataDto
    {
        public ClubPublicInfoDto Club { get; set; } = null!;
        public LandingPageContentDto LandingPage { get; set; } = null!;
        public List<DepartmentPublicDto> Departments { get; set; } = [];
        public List<EventPublicDto> UpcomingEvents { get; set; } = [];
        public List<PostPublicDto> RecentPosts { get; set; } = [];
        public List<MediaItemDto> Gallery { get; set; } = [];
        public LandingStatsDto Stats { get; set; } = null!;
    }

    // ── Sub-DTOs ─────────────────────────────────────────────────────────────
    public class ClubPublicInfoDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Code { get; set; } = null!;
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public string? CategoryName { get; set; }
        public string? AdvisorName { get; set; }
        public string? EstablishedDate { get; set; }
        public int MemberCount { get; set; }
        public string? ContactInfo { get; set; }
    }

    public class LandingPageContentDto
    {
        public string? HeroImage { get; set; }
        public string? Introduction { get; set; }
        public string? Mission { get; set; }
        public string? Vision { get; set; }
        public Dictionary<string, string>? SocialLinks { get; set; }
        public JsonElement? LayoutSettings { get; set; }
    }

    public class DepartmentPublicDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public int MemberCount { get; set; }
        public string? LeadName { get; set; }
    }

    public class EventPublicDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public DateTimeOffset? StartTime { get; set; }
        public DateTimeOffset? EndTime { get; set; }
        public string Status { get; set; } = null!;
    }

    public class PostPublicDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Content { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? Category { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? AuthorName { get; set; }
    }

    public class MediaItemDto
    {
        public int Id { get; set; }
        public string MediaUrl { get; set; } = null!;
        public string MediaType { get; set; } = null!;
        public string? Description { get; set; }
    }

    public class LandingStatsDto
    {
        public int MemberCount { get; set; }
        public int EventCount { get; set; }
        public int PostCount { get; set; }
        public int DepartmentCount { get; set; }
    }
}
