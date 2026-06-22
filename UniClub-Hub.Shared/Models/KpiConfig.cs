namespace UniClub_Hub.Shared.Models
{
    public class KpiConfig
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        public Club Club { get; set; } = null!;
        public ICollection<KpiCriteria> Criteria { get; set; } = [];
        public ICollection<KpiGradeConfig> Grades { get; set; } = [];
    }
}
