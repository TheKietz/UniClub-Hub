using System.ComponentModel.DataAnnotations;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Membership
{
    public class AddMemberDto
    {
        [Required]
        public string UserId { get; set; } = null!;

        // ClubAdmin / DeptLead / DeptDeputy / Member
        public ClubRole ClubRole { get; set; } = ClubRole.MEMBER;

        public int? DepartmentId { get; set; }
    }
}
