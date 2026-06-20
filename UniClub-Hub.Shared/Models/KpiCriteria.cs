using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    public class KpiCriteria
    {
        public int Id { get; set; }
        public int KpiConfigId { get; set; }
        public KpiMetricKey MetricKey { get; set; }
        public string DisplayName { get; set; } = null!;
        public string? Description { get; set; }
        public int Weight { get; set; }
        public bool IsEnabled { get; set; } = true;

        public KpiConfig KpiConfig { get; set; } = null!;
    }
}
