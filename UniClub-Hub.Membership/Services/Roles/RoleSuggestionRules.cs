using UniClub_Hub.Membership.DTOs.Ai;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Roles
{
    public static class RoleSuggestionRules
    {
        private const double ExcellentThreshold = 90;
        private const double GoodThreshold = 75;
        private const double AcceptableThreshold = 60;

        public static RoleSuggestionDto BuildRuleBasedSuggestion(
            ClubMembership membership,
            RoleSuggestionContext context)
        {
            var activeDays = DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - membership.JoinedDate.DayNumber;
            var completionRate = context.Tasks.Total > 0
                ? (double)context.Tasks.Done / context.Tasks.Total
                : 0;

            var kpiScore = context.Kpi?.TotalScore;
            var kpiGrade = context.Kpi?.Grade;
            bool hasStrongPerformance;
            double deptLeadConfidenceBase;

            if (kpiScore.HasValue)
            {
                hasStrongPerformance = kpiScore.Value >= GoodThreshold;
                deptLeadConfidenceBase = kpiScore.Value switch
                {
                    >= ExcellentThreshold => 0.85,
                    >= GoodThreshold => 0.72,
                    >= AcceptableThreshold => 0.55,
                    _ => 0.30,
                };
            }
            else
            {
                hasStrongPerformance = context.Contribution.TotalPoints >= 30 || completionRate >= 0.7;
                deptLeadConfidenceBase = ClampConfidence(0.62 + completionRate * 0.2 + Math.Min(context.Contribution.TotalPoints, 60) / 300.0);
            }

            var holdsDeptLeadPosition = context.Positions.Any(p =>
                p.Name.Contains("trưởng", StringComparison.OrdinalIgnoreCase) ||
                p.Name.Contains("lead", StringComparison.OrdinalIgnoreCase) ||
                p.Name.Contains("phụ trách", StringComparison.OrdinalIgnoreCase));

            if (holdsDeptLeadPosition && kpiScore >= GoodThreshold)
                deptLeadConfidenceBase = Math.Min(deptLeadConfidenceBase + 0.08, 0.95);

            var preferredDepartment = PickDepartment(context);
            var suggestions = new List<RoleSuggestionItemDto>();

            bool canSuggestDeptLead =
                !(kpiScore.HasValue && kpiScore.Value < AcceptableThreshold)
                && preferredDepartment is not null
                && !context.CurrentDeptLeadDepartmentIds.Contains(preferredDepartment.Id)
                && membership.ClubRole != ClubRole.CLUB_ADMIN
                && activeDays >= 30
                && hasStrongPerformance;

            if (canSuggestDeptLead)
            {
                suggestions.Add(new RoleSuggestionItemDto
                {
                    Role = ClubRole.DEPT_LEAD,
                    DepartmentId = preferredDepartment!.Id,
                    DepartmentName = preferredDepartment.Name,
                    Confidence = ClampConfidence(deptLeadConfidenceBase),
                    Reason = BuildDeptLeadReason(context, kpiScore, kpiGrade, holdsDeptLeadPosition, preferredDepartment),
                });
            }

            if (preferredDepartment is not null)
            {
                var memberConfidence = kpiScore switch
                {
                    >= ExcellentThreshold => 0.80,
                    >= GoodThreshold => 0.74,
                    >= AcceptableThreshold => 0.65,
                    < AcceptableThreshold when kpiScore.HasValue => 0.50,
                    _ => hasStrongPerformance ? 0.74 : 0.58,
                };

                suggestions.Add(new RoleSuggestionItemDto
                {
                    Role = ClubRole.MEMBER,
                    DepartmentId = preferredDepartment.Id,
                    DepartmentName = preferredDepartment.Name,
                    Confidence = memberConfidence,
                    Reason = "Phù hợp để tiếp tục phát triển chuyên môn trong ban gần với hồ sơ và dữ liệu tham gia.",
                });
            }

            if (suggestions.Count == 0)
            {
                suggestions.Add(new RoleSuggestionItemDto
                {
                    Role = ClubRole.MEMBER,
                    DepartmentId = membership.DepartmentId,
                    DepartmentName = membership.Department?.Name,
                    Confidence = 0.52,
                    Reason = "Chưa đủ dữ liệu để đề xuất vai trò cao hơn; nên tiếp tục theo dõi mức độ tham gia.",
                });
            }

            var signals = new List<string>
            {
                $"Thâm niên: {Math.Max(activeDays, 0)} ngày",
                $"Điểm đóng góp: {context.Contribution.TotalPoints}",
                $"Task hoàn thành: {context.Tasks.Done}/{context.Tasks.Total}",
            };
            if (context.Kpi != null)
                signals.Add($"KPI (3 tháng gần nhất): {context.Kpi.TotalScore:F1} điểm — {context.Kpi.Grade}");
            if (context.Positions.Count > 0)
                signals.Add($"Vị trí đang giữ: {string.Join(", ", context.Positions.Select(p => p.Name))}");

            return new RoleSuggestionDto
            {
                MembershipId = membership.Id,
                UserId = membership.UserId,
                MemberName = membership.User.FullName ?? membership.User.Email ?? membership.UserId,
                AiEnabled = false,
                Source = "Rules",
                Summary = BuildRuleBasedSummary(kpiScore, kpiGrade, hasStrongPerformance, activeDays),
                Signals = signals,
                Suggestions = suggestions.Take(3).ToList(),
            };
        }

        public static DepartmentSignal? PickDepartment(RoleSuggestionContext context)
        {
            if (context.Member.DepartmentId.HasValue)
                return context.Departments.FirstOrDefault(d => d.Id == context.Member.DepartmentId);

            var positionDept = context.Positions
                .Where(p => p.DepartmentName != null)
                .Select(p => context.Departments.FirstOrDefault(d => d.Name == p.DepartmentName))
                .FirstOrDefault(d => d != null);
            if (positionDept != null)
                return positionDept;

            var text = string.Join(
                " ",
                context.Member.Major,
                context.Member.CustomDataJson,
                context.Application?.AnswersJson,
                context.Application?.MemberFieldDataJson
            ).ToLowerInvariant();

            return context.Departments.FirstOrDefault(d =>
                    text.Contains(d.Name.ToLowerInvariant(), StringComparison.Ordinal)
                )
                ?? context.Departments.FirstOrDefault();
        }

        public static double ClampConfidence(double confidence) =>
            Math.Round(Math.Min(Math.Max(confidence, 0.0), 1.0), 2);

        private static string BuildDeptLeadReason(
            RoleSuggestionContext context,
            double? kpiScore,
            string? kpiGrade,
            bool holdsDeptLeadPosition,
            DepartmentSignal preferredDepartment)
        {
            var parts = new List<string>();
            if (kpiScore >= GoodThreshold && !string.IsNullOrWhiteSpace(kpiGrade))
                parts.Add($"kết quả KPI {kpiGrade.ToLowerInvariant()}");
            if (holdsDeptLeadPosition)
                parts.Add("đang giữ vị trí có trách nhiệm lãnh đạo");
            if (!context.CurrentDeptLeadDepartmentIds.Contains(preferredDepartment.Id))
                parts.Add("ban này chưa có trưởng ban đang hoạt động");

            return parts.Count > 0
                ? $"Thành viên có {string.Join(", ", parts)}."
                : "Thành viên có tín hiệu đóng góp tốt và ban này chưa có trưởng ban đang hoạt động.";
        }

        private static string BuildRuleBasedSummary(double? kpiScore, string? kpiGrade, bool hasStrongPerformance, int activeDays)
        {
            if (kpiScore >= ExcellentThreshold)
                return $"Thành viên đạt kết quả KPI {(kpiGrade ?? "xuất sắc").ToLowerInvariant()} — đủ điều kiện xem xét vai trò lãnh đạo.";
            if (kpiScore >= GoodThreshold)
                return $"Thành viên có kết quả KPI {(kpiGrade ?? "tốt").ToLowerInvariant()} và thâm niên đủ để đảm nhận trách nhiệm cao hơn.";
            if (kpiScore >= AcceptableThreshold)
                return "Thành viên đạt KPI ở mức cơ bản; nên tiếp tục theo dõi trước khi nâng vai trò.";
            if (kpiScore.HasValue)
                return "KPI hiện tại cần cải thiện — không khuyến nghị nâng vai trò lúc này.";
            if (hasStrongPerformance && activeDays >= 30)
                return "Gợi ý được tạo bằng luật nội bộ dựa trên dữ liệu đóng góp và công việc.";
            return "Chưa đủ dữ liệu KPI; gợi ý dựa trên tín hiệu hoạt động cơ bản.";
        }
    }
}
