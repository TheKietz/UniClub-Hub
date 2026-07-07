namespace UniClub_Hub.Portal.DTOs
{
    /// <summary>Một sự kiện trên trang tổng hợp toàn trường. ClubId == null ⇒ cấp trường.</summary>
    public class PortalEventDto
    {
        public int Id { get; set; }
        public int? ClubId { get; set; }
        public string? ClubName { get; set; }
        public string? ClubLogoUrl { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public string? BannerUrl { get; set; }
        public DateTimeOffset? StartTime { get; set; }
        public DateTimeOffset? EndTime { get; set; }
        public int? MaxParticipants { get; set; }
        public int ParticipantCount { get; set; }
        public string Status { get; set; } = null!;
        public string? Category { get; set; }
    }

    /// <summary>Một bài tin trên trang tổng hợp toàn trường. ClubId == null ⇒ cấp trường.</summary>
    public class PortalNewsDto
    {
        public int Id { get; set; }
        public int? ClubId { get; set; }
        public string? ClubName { get; set; }
        public string? ClubLogoUrl { get; set; }
        public string Title { get; set; } = null!;
        public string? Content { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string Category { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public string? AuthorName { get; set; }
    }

    public class PortalPagedResult<T>
    {
        public IEnumerable<T> Data { get; set; } = [];
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
