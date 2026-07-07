namespace UniClub_Hub.Membership.DTOs.User
{
    /// <summary>Một sự kiện mà người dùng đã đăng ký tham gia (lịch sử tham gia sự kiện).</summary>
    public class MyEventRegistrationDto
    {
        public int EventId { get; set; }
        public string EventName { get; set; } = null!;
        public int? ClubId { get; set; }          // null = sự kiện cấp trường
        public string? ClubName { get; set; }
        public string? Location { get; set; }
        public DateTimeOffset? StartTime { get; set; }
        public DateTimeOffset? EndTime { get; set; }
        /// <summary>Draft / InProgress / Completed / Cancelled</summary>
        public string EventStatus { get; set; } = null!;
        public DateTimeOffset RegisteredAt { get; set; }
        /// <summary>Pending / CheckedIn / Absent</summary>
        public string Attendance { get; set; } = null!;
        public DateTimeOffset? CheckedInAt { get; set; }
        /// <summary>Có thể tự hủy tham gia không (sự kiện chưa kết thúc).</summary>
        public bool CanCancel { get; set; }
    }
}
