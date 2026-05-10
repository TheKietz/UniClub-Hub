using System.ComponentModel.DataAnnotations;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Club
{
    public class UpdateClubDto
    {
        [Required, MaxLength(255)]
        public string Name { get; set; } = null!;

        public int? CategoryId { get; set; }
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public string? ContactInfo { get; set; }
        public DateOnly? EstablishedDate { get; set; }
        public string? AdvisorName { get; set; }
        public ClubStatus Status { get; set; } = ClubStatus.Active;
    }
}
