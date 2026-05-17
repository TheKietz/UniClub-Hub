using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Resignation
{
    public class ReviewResignationDto
    {
        public ResignationStatus Status { get; set; } // Approved | Rejected
        public string? ReviewNote { get; set; }
    }
}
