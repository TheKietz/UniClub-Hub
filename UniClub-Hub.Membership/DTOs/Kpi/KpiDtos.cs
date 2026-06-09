using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Kpi
{
    public class KpiConfigDto
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int TotalWeight { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
        public List<KpiCriteriaDto> Criteria { get; set; } = [];
        public List<KpiGradeDto> Grades { get; set; } = [];
    }

    public class KpiCriteriaDto
    {
        public int Id { get; set; }
        public KpiMetricKey MetricKey { get; set; }
        public string DisplayName { get; set; } = null!;
        public string? Description { get; set; }
        public int Weight { get; set; }
        public bool IsEnabled { get; set; }
    }

    public class UpdateKpiCriteriaDto
    {
        public KpiMetricKey MetricKey { get; set; }
        public string DisplayName { get; set; } = null!;
        public string? Description { get; set; }
        public int Weight { get; set; }
        public bool IsEnabled { get; set; }
    }

    public class ToggleKpiCriteriaDto
    {
        public bool IsEnabled { get; set; }
    }

    public class KpiGradeDto
    {
        public int Id { get; set; }
        public string Label { get; set; } = null!;
        public int MinScore { get; set; }
        public string? Color { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class UpdateKpiGradesDto
    {
        public List<UpdateKpiGradeDto> Grades { get; set; } = [];
    }

    public class UpdateKpiGradeDto
    {
        public string Label { get; set; } = null!;
        public int MinScore { get; set; }
        public string? Color { get; set; }
    }

    public class KpiResultsDto
    {
        public int ClubId { get; set; }
        public int? DepartmentId { get; set; }
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public int TotalMembers { get; set; }
        public double AverageScore { get; set; }
        public List<MemberKpiResultDto> Members { get; set; } = [];
    }

    public class MemberKpiResultDto
    {
        public int MembershipId { get; set; }
        public string UserId { get; set; } = null!;
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? AvatarUrl { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public ClubRole ClubRole { get; set; }
        public double TotalScore { get; set; }
        public string Grade { get; set; } = null!;
        public string? GradeColor { get; set; }
        public int Rank { get; set; }
        public List<KpiMetricScoreDto> Metrics { get; set; } = [];
    }

    public class KpiMetricScoreDto
    {
        public KpiMetricKey MetricKey { get; set; }
        public string DisplayName { get; set; } = null!;
        public int Weight { get; set; }
        public double RawScore { get; set; }
        public double WeightedScore { get; set; }
        public string Detail { get; set; } = null!;
    }
}
