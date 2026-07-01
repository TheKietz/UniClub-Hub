using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.Services
{
    /// <summary>
    /// Rule-based deadline-slip detection shared by the at-risk endpoint and the
    /// reminder background service.
    ///
    ///   Expected progress = (days elapsed / total days) * 100
    ///   At risk           = (Progress &lt; expected progress) AND (≤ 2 days remaining)
    /// </summary>
    public static class DeadlineRisk
    {
        public static (double ExpectedProgress, double DaysRemaining, bool AtRisk) Evaluate(
            DateTimeOffset start, DateTimeOffset deadline, int progress, ClubTaskStatus status, DateTimeOffset now)
        {
            var daysRemaining = (deadline - now).TotalDays;

            if (status == ClubTaskStatus.Done)
                return (100, Math.Round(daysRemaining, 1), false);

            var totalDays = (deadline - start).TotalDays;
            var elapsedDays = (now - start).TotalDays;
            var expected = totalDays <= 0
                ? 100
                : Math.Clamp(elapsedDays / totalDays * 100, 0, 100);

            var atRisk = progress < expected && daysRemaining <= 2;
            return (Math.Round(expected, 1), Math.Round(daysRemaining, 1), atRisk);
        }
    }
}
