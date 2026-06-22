using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniClub_Hub.Shared.Models
{
    [Table("NotificationPreferences")]
    public class NotificationPreference
    {
        public int Id { get; set; }

        /// <summary>null = global default (Super Admin). Non-null = per-club override.</summary>
        public int? ClubId { get; set; }

        [MaxLength(100)]
        public string TriggerKey { get; set; } = null!;

        /// <summary>TARGET_USER | APPLICANT | CLUB_ADMIN | DEPT_LEAD | ALL_MEMBERS | SUPER_ADMIN</summary>
        [MaxLength(50)]
        public string RecipientRole { get; set; } = null!;

        public bool InAppEnabled { get; set; } = true;
        public bool EmailEnabled { get; set; } = false;

        /// <summary>In-app message template with {{vars}}</summary>
        public string? InAppTemplate { get; set; }

        public string? EmailSubject { get; set; }

        /// <summary>HTML email body template with {{vars}}</summary>
        public string? EmailTemplate { get; set; }

        public Club? Club { get; set; }
    }
}
