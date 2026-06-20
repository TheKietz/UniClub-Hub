namespace UniClub_Hub.Membership.DTOs.Permission
{
    public class ClubPermissionDto
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string Group { get; set; } = null!;
        public string Module { get; set; } = null!;
    }
}
