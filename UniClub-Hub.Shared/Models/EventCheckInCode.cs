namespace UniClub_Hub.Shared.Models
{
    /// <summary>
    /// Mã check-in phát cho từng người đăng ký sự kiện (QR/one-time code).
    /// Bảng đã tồn tại trên DB dev (Neon) từ trước; entity này đưa nó vào model để quản lý.
    /// </summary>
    public class EventCheckInCode
    {
        public int Id { get; set; }
        public int EventRegistrationId { get; set; }
        public int EventId { get; set; }
        public string UserId { get; set; } = null!;
        public string Code { get; set; } = null!;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public EventRegistration EventRegistration { get; set; } = null!;
        public ClubEvent Event { get; set; } = null!;
        public ApplicationUser User { get; set; } = null!;
    }
}
