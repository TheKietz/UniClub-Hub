namespace UniClub_Hub.Membership.DTOs.Membership
{
    public class UpdateMemberDto
    {
        public string ClubRole { get; set; } = "MEMBER";
        public int? DepartmentId { get; set; }
    }
}
