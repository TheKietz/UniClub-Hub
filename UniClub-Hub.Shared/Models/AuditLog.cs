using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    public class AuditLog
    {
        public int Id { get; set; }
        public string? UserId { get; set; } // Ai thực hiện
        public AuditAction Action { get; set; } // Create, Update, Delete
        public string EntityName { get; set; } = string.Empty; // Tên bảng (VD: Tasks)
        public string EntityId { get; set; } = string.Empty; // ID của bản ghi bị tác động
        public string? OldValue { get; set; } // Giá trị cũ (JSON)
        public string? NewValue { get; set; } // Giá trị mới (JSON)
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
