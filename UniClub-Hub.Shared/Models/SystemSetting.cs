using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Shared.Models
{
    public class SystemSetting
    {
        [Key]
        [MaxLength(100)]
        public string Key { get; set; } = null!;

        public string Value { get; set; } = string.Empty;

        [MaxLength(200)]
        public string Label { get; set; } = null!;

        public string? Description { get; set; }

        /// <summary>auth | club | system | notification</summary>
        [MaxLength(50)]
        public string Category { get; set; } = null!;

        /// <summary>text | textarea | toggle | number | tags</summary>
        [MaxLength(20)]
        public string InputType { get; set; } = null!;

        public bool IsEnabled { get; set; } = true;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string? UpdatedBy { get; set; }
    }
}
