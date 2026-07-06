namespace UniClub_Hub.Membership.DTOs.NotificationPreference
{
    public class NotificationPreferenceDto
    {
        public string TriggerKey { get; set; } = null!;
        public string TriggerLabel { get; set; } = null!;
        public string TriggerCategory { get; set; } = null!;
        public string RecipientRole { get; set; } = null!;
        public string RecipientRoleLabel { get; set; } = null!;
        public bool InAppEnabled { get; set; }
        public bool EmailEnabled { get; set; }
        public string? InAppTemplate { get; set; }
        public string? EmailSubject { get; set; }
        public string? EmailTemplate { get; set; }
        /// <summary>True when this is a club-specific override (not the global default).</summary>
        public bool IsOverride { get; set; }
        /// <summary>Global default in-app (club GET only).</summary>
        public bool GlobalInAppEnabled { get; set; }
        /// <summary>Global default email (club GET only).</summary>
        public bool GlobalEmailEnabled { get; set; }
    }

    public class UpdateNotificationPreferenceDto
    {
        public bool InAppEnabled { get; set; }
        public bool EmailEnabled { get; set; }
        public string? InAppTemplate { get; set; }
        public string? EmailSubject { get; set; }
        public string? EmailTemplate { get; set; }
    }
}
