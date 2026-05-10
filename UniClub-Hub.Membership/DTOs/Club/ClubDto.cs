using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Club
{
    public class ClubDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Code { get; set; } = null!;
        public ClubStatus Status { get; set; }
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public string? ContactInfo { get; set; }
        public DateOnly? EstablishedDate { get; set; }
        public string? AdvisorName { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public int MemberCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
