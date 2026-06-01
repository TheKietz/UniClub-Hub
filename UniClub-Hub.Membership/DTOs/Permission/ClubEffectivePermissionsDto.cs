namespace UniClub_Hub.Membership.DTOs.Permission
{
    public class ClubEffectivePermissionsDto
    {
        public int ClubId { get; set; }
        public bool IsSuperAdmin { get; set; }
        public bool IsClubAdmin { get; set; }
        public List<string> PermissionCodes { get; set; } = [];
    }
}
