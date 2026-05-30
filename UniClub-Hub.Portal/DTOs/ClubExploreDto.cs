namespace UniClub_Hub.Portal.DTOs
{
    public class ClubExploreDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Code { get; set; } = null!;
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public string? CategoryName { get; set; }
        public int MemberCount { get; set; }
        public string Status { get; set; } = null!;
        public string? PrimaryColor { get; set; }
    }

    public class ExplorePagedResult
    {
        public IEnumerable<ClubExploreDto> Data { get; set; } = [];
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
