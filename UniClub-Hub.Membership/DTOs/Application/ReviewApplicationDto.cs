using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Membership.DTOs.Application
{
    public class ReviewApplicationDto
    {
        [Required]
        // Interview / Accepted / Rejected
        public string Status { get; set; } = null!;
    }
}
