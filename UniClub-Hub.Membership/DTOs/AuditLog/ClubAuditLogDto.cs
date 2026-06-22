namespace UniClub_Hub.Membership.DTOs.AuditLog
{
    public class ClubAuditLogDto
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public string UserName { get; set; } = "Hệ thống";
        public string? UserAvatarUrl { get; set; }

        /// <summary>Create | Update | Delete</summary>
        public string Action { get; set; } = null!;

        /// <summary>CLB | Thành viên | Ban bộ phận | Đơn đăng ký</summary>
        public string Module { get; set; } = null!;

        public string EntityId { get; set; } = null!;
        public string? EntityTitle { get; set; }
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public DateTime Timestamp { get; set; }
        public string? ClubName { get; set; }
    }
}
