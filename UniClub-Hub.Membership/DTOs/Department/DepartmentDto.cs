namespace UniClub_Hub.Membership.DTOs.Department
{
    public class DepartmentDto
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public int MemberCount { get; set; }
    }
}
