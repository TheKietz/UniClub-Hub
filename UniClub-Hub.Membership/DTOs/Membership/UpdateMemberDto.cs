using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Membership
{
    public class UpdateMemberDto
    {
        public ClubRole ClubRole { get; set; } = ClubRole.MEMBER;
        public int? DepartmentId { get; set; }
    }
}
