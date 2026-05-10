namespace UniClub_Hub.Shared.Common
{
    public static class MembershipStatus
    {
        public const string Active    = "Active";
        public const string Probation = "Probation";
        public const string Resigned  = "Resigned";
    }

    public static class ClubRole
    {
        public const string ClubAdmin = "CLUB_ADMIN";
        public const string DeptLead  = "DEPT_LEAD";
        public const string Member    = "MEMBER";
    }

    public static class ApplicationStatus
    {
        public const string Pending   = "Pending";
        public const string Interview = "Interview";
        public const string Accepted  = "Accepted";
        public const string Rejected  = "Rejected";
    }

    public static class SystemRole
    {
        public const string SuperAdmin = "SUPER_ADMIN";
        public const string User       = "USER";
    }

    public static class ClubStatus
    {
        public const string Active   = "Active";
        public const string Inactive = "Inactive";
    }
}
