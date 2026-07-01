using UniClub_Hub.Membership.DTOs.Kpi;
using UniClub_Hub.Membership.Services.Kpi;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class KpiCalculatorTests
{
    private static List<KpiGradeConfig> DefaultGrades() =>
    [
        new() { Label = "Xuất sắc", MinScore = 90, DisplayOrder = 0 },
        new() { Label = "Tốt", MinScore = 75, DisplayOrder = 1 },
        new() { Label = "Đạt", MinScore = 60, DisplayOrder = 2 },
        new() { Label = "Cần cải thiện", MinScore = 0, DisplayOrder = 3 },
    ];

    [Theory]
    [InlineData(-5, 0)]
    [InlineData(150, 100)]
    [InlineData(42.5, 42.5)]
    public void Clamp_BoundsValueBetweenZeroAndOneHundred(double input, double expected)
    {
        Assert.Equal(expected, KpiCalculator.Clamp(input));
    }

    [Fact]
    public void Ratio_WithZeroDenominator_ReturnsZero()
    {
        var (score, _) = KpiCalculator.Ratio(5, 0, "detail");

        Assert.Equal(0, score);
    }

    [Fact]
    public void Ratio_WithValidValues_ReturnsPercentage()
    {
        var (score, _) = KpiCalculator.Ratio(3, 4, "detail");

        Assert.Equal(75, score);
    }

    [Theory]
    [InlineData(95, "Xuất sắc")]
    [InlineData(90, "Xuất sắc")]
    [InlineData(75, "Tốt")]
    [InlineData(60, "Đạt")]
    [InlineData(10, "Cần cải thiện")]
    public void Grade_SelectsExpectedLabel(double score, string expectedLabel)
    {
        var grade = KpiCalculator.Grade(score, DefaultGrades());

        Assert.Equal(expectedLabel, grade.Label);
    }

    [Fact]
    public void ScoreMetric_TaskCompletion_CalculatesWeightedScore()
    {
        var criterion = new KpiCriteria
        {
            MetricKey = KpiMetricKey.TaskCompletion,
            DisplayName = "Hoàn thành",
            Weight = 40,
        };
        var stats = new MemberTaskStats { Total = 10, Done = 8 };

        var result = KpiCalculator.ScoreMetric(criterion, stats, 0, 10);

        Assert.Equal(80, result.RawScore);
        Assert.Equal(32, result.WeightedScore);
    }

    [Fact]
    public void ScoreMetric_OnTimeCompletion_WithZeroDone_ReturnsZero()
    {
        var criterion = new KpiCriteria
        {
            MetricKey = KpiMetricKey.OnTimeCompletion,
            DisplayName = "Đúng hạn",
            Weight = 25,
        };
        var stats = new MemberTaskStats { Done = 0, OnTimeDone = 0 };

        var result = KpiCalculator.ScoreMetric(criterion, stats, 0, 0);

        Assert.Equal(0, result.RawScore);
        Assert.Equal(0, result.WeightedScore);
    }

    [Fact]
    public void ScoreMetric_ContributionPoints_ClampsAtOneHundred()
    {
        var criterion = new KpiCriteria
        {
            MetricKey = KpiMetricKey.ContributionPoints,
            DisplayName = "Đóng góp",
            Weight = 15,
        };

        var result = KpiCalculator.ScoreMetric(criterion, new MemberTaskStats(), 150, 0);

        Assert.Equal(100, result.RawScore);
        Assert.Equal(15, result.WeightedScore);
    }

    [Fact]
    public void ScoreMetric_Workload_NormalizesAgainstMaxTaskCount()
    {
        var criterion = new KpiCriteria
        {
            MetricKey = KpiMetricKey.Workload,
            DisplayName = "Workload",
            Weight = 10,
        };
        var stats = new MemberTaskStats { Total = 5 };

        var result = KpiCalculator.ScoreMetric(criterion, stats, 0, 10);

        Assert.Equal(50, result.RawScore);
        Assert.Equal(5, result.WeightedScore);
    }

    [Fact]
    public void ScoreMetric_AvgProgress_UsesProgressSumOverTotal()
    {
        var criterion = new KpiCriteria
        {
            MetricKey = KpiMetricKey.AvgProgress,
            DisplayName = "Tiến độ",
            Weight = 15,
        };
        var stats = new MemberTaskStats { Total = 4, ProgressSum = 300 };

        var result = KpiCalculator.ScoreMetric(criterion, stats, 0, 4);

        Assert.Equal(75, result.RawScore);
        Assert.Equal(11.2, result.WeightedScore);
    }

    [Fact]
    public void NormalizePeriod_WhenFromAfterTo_ThrowsInvalidOperation()
    {
        var from = new DateOnly(2026, 6, 15);
        var to = new DateOnly(2026, 6, 1);

        Assert.Throws<InvalidOperationException>(() => KpiCalculator.NormalizePeriod(from, to));
    }

    [Fact]
    public void ValidateTotalWeight_WhenNotOneHundred_ThrowsInvalidOperation()
    {
        var criteria = new[]
        {
            new KpiCriteria { MetricKey = KpiMetricKey.TaskCompletion, Weight = 60, IsEnabled = true },
            new KpiCriteria { MetricKey = KpiMetricKey.Workload, Weight = 30, IsEnabled = true },
        };

        Assert.Throws<InvalidOperationException>(() => KpiCalculator.ValidateTotalWeight(criteria));
    }

    [Fact]
    public void ValidateCriteriaPayload_WithDuplicateMetricKey_ThrowsInvalidOperation()
    {
        var payload = new List<UpdateKpiCriteriaDto>
        {
            new() { MetricKey = KpiMetricKey.TaskCompletion, DisplayName = "A", Weight = 50 },
            new() { MetricKey = KpiMetricKey.TaskCompletion, DisplayName = "B", Weight = 50 },
        };

        Assert.Throws<InvalidOperationException>(() => KpiCalculator.ValidateCriteriaPayload(payload));
    }

    [Fact]
    public void ValidateGradesPayload_WithoutFallbackGrade_ThrowsInvalidOperation()
    {
        var grades = new List<UpdateKpiGradeDto>
        {
            new() { Label = "Tốt", MinScore = 75 },
            new() { Label = "Đạt", MinScore = 60 },
        };

        Assert.Throws<InvalidOperationException>(() => KpiCalculator.ValidateGradesPayload(grades));
    }
}
