namespace UniClub_Hub.Shared.Models
{
    public class ClubPositionPermission
    {
        public int PositionId { get; set; }
        public string PermissionCode { get; set; } = null!;

        public ClubPosition Position { get; set; } = null!;
    }
}
