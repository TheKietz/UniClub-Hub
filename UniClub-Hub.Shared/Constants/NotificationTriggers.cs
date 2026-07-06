namespace UniClub_Hub.Shared.Constants
{
    public static class NotificationTriggers
    {
        // ── Membership ──────────────────────────────────────────────────────
        public const string ApplicationSubmitted = "application.submitted";
        public const string ApplicationInterview = "application.interview";
        public const string ApplicationAccepted  = "application.accepted";
        public const string ApplicationRejected  = "application.rejected";
        public const string MemberAdded          = "member.added";
        public const string MemberRoleChanged    = "member.role_changed";
        public const string MemberRemoved        = "member.removed";
        public const string ResignationSubmitted = "resignation.submitted";
        public const string ResignationReviewed  = "resignation.reviewed";

        // ── Operations ──────────────────────────────────────────────────────
        public const string TaskAssigned         = "task.assigned";
        public const string TaskDeadlineSoon     = "task.deadline_soon";
        public const string TaskStatusChanged    = "task.status_changed";
        public const string EventCreated         = "event.created";
        public const string EventReminder        = "event.reminder";

        // ── System ──────────────────────────────────────────────────────────
        public const string SystemAnnouncement   = "system.announcement";
        public const string NotificationPolicyChanged = "system.notification_policy_changed";

        // ── Labels (for UI display) ─────────────────────────────────────────
        public static readonly Dictionary<string, (string Label, string Category)> Meta = new()
        {
            [ApplicationSubmitted] = ("Có đơn đăng ký mới",           "Tuyển thành viên"),
            [ApplicationInterview] = ("Đơn chuyển sang phỏng vấn",    "Tuyển thành viên"),
            [ApplicationAccepted]  = ("Đơn được chấp nhận",           "Tuyển thành viên"),
            [ApplicationRejected]  = ("Đơn bị từ chối",               "Tuyển thành viên"),
            [MemberAdded]          = ("Thành viên được thêm vào CLB",  "Quản lý thành viên"),
            [MemberRoleChanged]    = ("Thay đổi vai trò thành viên",   "Quản lý thành viên"),
            [MemberRemoved]        = ("Thành viên bị xóa khỏi CLB",   "Quản lý thành viên"),
            [ResignationSubmitted] = ("Có đơn từ chức mới",           "Từ chức"),
            [ResignationReviewed]  = ("Kết quả đơn từ chức",          "Từ chức"),
            [TaskAssigned]         = ("Được giao việc",                "Công việc"),
            [TaskDeadlineSoon]     = ("Deadline sắp đến",              "Công việc"),
            [TaskStatusChanged]    = ("Trạng thái công việc thay đổi", "Công việc"),
            [EventCreated]         = ("Sự kiện mới",                   "Sự kiện"),
            [EventReminder]        = ("Nhắc lịch sự kiện",             "Sự kiện"),
            [SystemAnnouncement]   = ("Thông báo hệ thống",            "Hệ thống"),
            [NotificationPolicyChanged] = ("Cập nhật cấu hình thông báo", "Hệ thống"),
        };
    }

    public static class NotificationRecipientRoles
    {
        /// <summary>Specific user passed via context["targetUserId"]</summary>
        public const string TargetUser  = "TARGET_USER";
        /// <summary>Specific applicant passed via context["applicantUserId"]</summary>
        public const string Applicant   = "APPLICANT";
        /// <summary>All CLUB_ADMIN members in the club</summary>
        public const string ClubAdmin   = "CLUB_ADMIN";
        /// <summary>All DEPT_LEAD members in the club</summary>
        public const string DeptLead    = "DEPT_LEAD";
        /// <summary>All active members in the club</summary>
        public const string AllMembers  = "ALL_MEMBERS";
        /// <summary>All users with SUPER_ADMIN role</summary>
        public const string SuperAdmin  = "SUPER_ADMIN";

        public static readonly Dictionary<string, string> Labels = new()
        {
            [TargetUser]  = "Người được tác động",
            [Applicant]   = "Ứng viên",
            [ClubAdmin]   = "Trưởng CLB",
            [DeptLead]    = "Trưởng ban",
            [AllMembers]  = "Tất cả thành viên",
            [SuperAdmin]  = "Quản trị viên hệ thống",
        };
    }
}
