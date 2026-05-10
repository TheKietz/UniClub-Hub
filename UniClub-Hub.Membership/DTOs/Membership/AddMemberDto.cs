using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Membership.DTOs.Membership
{
    public class AddMemberDto
    {
        [Required]
        public string UserId { get; set; } = null!;

        // CLUB_ADMIN / DEPT_LEAD / MEMBER
        public string ClubRole { get; set; } = "MEMBER";

        public int? DepartmentId { get; set; }
    }
}
