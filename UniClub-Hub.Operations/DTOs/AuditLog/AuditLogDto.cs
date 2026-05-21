namespace UniClub_Hub.Operations.DTOs.AuditLog
{
    public class AuditLogDto
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public string UserName { get; set; } = "Hệ thống";
        public string? UserAvatarUrl { get; set; }

        /// <summary>Create | Update | Delete</summary>
        public string Action { get; set; } = null!;

        /// <summary>Frontend-friendly module name: Tasks | Events | Sprints</summary>
        public string Module { get; set; } = null!;

        public string EntityId { get; set; } = null!;
        public string? EntityTitle { get; set; }

        /// <summary>Serialised JSON of the record before the change.</summary>
        public string? OldValue { get; set; }

        /// <summary>Serialised JSON of the record after the change.</summary>
        public string? NewValue { get; set; }

        public DateTime Timestamp { get; set; }
    }
}
