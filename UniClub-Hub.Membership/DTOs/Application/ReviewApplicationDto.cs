using System.ComponentModel.DataAnnotations;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Application
{
    public class ReviewApplicationDto
    {
        [Required]
        // Interview / Accepted / Rejected
        public ApplicationStatus Status { get; set; }
        public string? ReviewNote { get; set; }
    }
}
