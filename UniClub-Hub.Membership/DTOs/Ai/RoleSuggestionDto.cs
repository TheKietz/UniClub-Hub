using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Ai
{
    public class RoleSuggestionDto
    {
        public int MembershipId { get; set; }
        public string UserId { get; set; } = null!;
        public string MemberName { get; set; } = null!;
        public bool AiEnabled { get; set; }
        public string Source { get; set; } = "Rules";
        public string Summary { get; set; } = null!;
        public List<string> Signals { get; set; } = [];
        public List<RoleSuggestionItemDto> Suggestions { get; set; } = [];
    }

    public class RoleSuggestionItemDto
    {
        public ClubRole Role { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public double Confidence { get; set; }
        public string Reason { get; set; } = null!;
    }
}
