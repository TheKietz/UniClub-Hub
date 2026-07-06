using UniClub_Hub.Membership.DTOs.Kpi;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Kpi
{
    public static class KpiCalculator
    {
        public static KpiMetricScoreDto ScoreMetric(
            KpiCriteria criterion,
            MemberTaskStats stats,
            int contributionPoints,
            int maxTaskCount)
        {
            var (raw, detail) = criterion.MetricKey switch
            {
                KpiMetricKey.TaskCompletion => Ratio(stats.Done, stats.Total, $"{stats.Done}/{stats.Total} task hoàn thành"),
                KpiMetricKey.OnTimeCompletion => Ratio(stats.OnTimeDone, stats.Done, $"{stats.OnTimeDone}/{stats.Done} task hoàn thành đúng hạn"),
                KpiMetricKey.AvgProgress => (
                    stats.Total == 0 ? 0 : Clamp(stats.ProgressSum / stats.Total),
                    stats.Total == 0 ? "Chưa có task trong kỳ" : $"Tiến độ trung bình {Math.Round(stats.ProgressSum / stats.Total, 1)}%"
                ),
                KpiMetricKey.ContributionPoints => (
                    Clamp(contributionPoints),
                    $"{contributionPoints} điểm đóng góp, tối đa tính 100"
                ),
                KpiMetricKey.Workload => (
                    maxTaskCount == 0 ? 0 : Clamp((double)stats.Total / maxTaskCount * 100),
                    $"{stats.Total}/{maxTaskCount} task so với người có workload cao nhất"
                ),
                _ => (0.0, "Không hỗ trợ tiêu chí này"),
            };

            raw = Math.Round(raw, 1);
            return new KpiMetricScoreDto
            {
                MetricKey = criterion.MetricKey,
                DisplayName = criterion.DisplayName,
                Weight = criterion.Weight,
                RawScore = raw,
                WeightedScore = Math.Round(raw * criterion.Weight / 100, 1),
                Detail = detail,
            };
        }

        public static void ValidateCriteriaPayload(List<UpdateKpiCriteriaDto> criteria)
        {
            if (criteria.Count == 0)
                throw new InvalidOperationException("Danh sách tiêu chí KPI không được rỗng.");

            var knownKeys = Enum.GetValues<KpiMetricKey>().ToHashSet();
            var seen = new HashSet<KpiMetricKey>();

            foreach (var item in criteria)
            {
                if (!knownKeys.Contains(item.MetricKey))
                    throw new InvalidOperationException($"MetricKey {item.MetricKey} không hợp lệ.");
                if (!seen.Add(item.MetricKey))
                    throw new InvalidOperationException($"MetricKey {item.MetricKey} bị trùng.");
                if (string.IsNullOrWhiteSpace(item.DisplayName))
                    throw new InvalidOperationException("Tên hiển thị của tiêu chí không được rỗng.");
                if (item.Weight < 0 || item.Weight > 100)
                    throw new InvalidOperationException("Trọng số KPI phải nằm trong khoảng 0-100.");
            }
        }

        public static void ValidateTotalWeight(IEnumerable<KpiCriteria> criteria)
        {
            var total = criteria.Where(c => c.IsEnabled).Sum(c => c.Weight);
            if (total != 100)
                throw new InvalidOperationException($"Tổng trọng số các tiêu chí đang bật phải bằng 100. Hiện tại: {total}.");
        }

        public static void ValidateGradesPayload(List<UpdateKpiGradeDto> grades)
        {
            if (grades.Count < 2)
                throw new InvalidOperationException("Cần ít nhất 2 mức xếp loại KPI.");

            var minScores = new HashSet<int>();
            var hasFallback = false;
            foreach (var grade in grades)
            {
                if (string.IsNullOrWhiteSpace(grade.Label))
                    throw new InvalidOperationException("Tên mức xếp loại không được rỗng.");
                if (grade.MinScore < 0 || grade.MinScore > 100)
                    throw new InvalidOperationException("Ngưỡng điểm xếp loại phải nằm trong khoảng 0-100.");
                if (!minScores.Add(grade.MinScore))
                    throw new InvalidOperationException($"Ngưỡng điểm {grade.MinScore} bị trùng.");
                if (grade.MinScore == 0)
                    hasFallback = true;
                if (!string.IsNullOrWhiteSpace(grade.Color) && grade.Color.Length > 20)
                    throw new InvalidOperationException("Mã màu xếp loại không được vượt quá 20 ký tự.");
            }

            if (!hasFallback)
                throw new InvalidOperationException("Cần có một mức xếp loại với MinScore = 0 để làm fallback.");
        }

        public static (double score, string detail) Ratio(int numerator, int denominator, string detail)
        {
            if (denominator == 0) return (0, detail);
            return (Clamp((double)numerator / denominator * 100), detail);
        }

        public static double Clamp(double value) => Math.Max(0, Math.Min(100, value));

        public static KpiGradeConfig Grade(double score, List<KpiGradeConfig> grades) =>
            grades
                .OrderByDescending(g => g.MinScore)
                .ThenBy(g => g.DisplayOrder)
                .FirstOrDefault(g => score >= g.MinScore)
            ?? grades.OrderBy(g => g.MinScore).First();

        public static (
            DateOnly from,
            DateOnly to,
            DateTime startDateTime,
            DateTime endDateTime,
            DateTimeOffset startOffset,
            DateTimeOffset endOffset
        ) NormalizePeriod(DateOnly? fromDate, DateOnly? toDate)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var from = fromDate ?? new DateOnly(today.Year, today.Month, 1);
            var to = toDate ?? today;
            if (from > to)
                throw new InvalidOperationException("Ngày bắt đầu không được lớn hơn ngày kết thúc.");

            var startDateTime = DateTime.SpecifyKind(from.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var endDateTime = DateTime.SpecifyKind(to.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            return (
                from,
                to,
                startDateTime,
                endDateTime,
                new DateTimeOffset(startDateTime),
                new DateTimeOffset(endDateTime)
            );
        }
    }

    public sealed class MemberTaskStats
    {
        public int Total { get; set; }
        public int Done { get; set; }
        public int OnTimeDone { get; set; }
        public double ProgressSum { get; set; }
    }
}
