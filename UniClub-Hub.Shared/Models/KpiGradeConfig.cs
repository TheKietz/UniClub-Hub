namespace UniClub_Hub.Shared.Models
{
    public class KpiGradeConfig
    {
        public int Id { get; set; }
        public int KpiConfigId { get; set; }
        public string Label { get; set; } = null!;
        public int MinScore { get; set; }
        public string? Color { get; set; }
        public int DisplayOrder { get; set; }

        public KpiConfig KpiConfig { get; set; } = null!;
    }
}
