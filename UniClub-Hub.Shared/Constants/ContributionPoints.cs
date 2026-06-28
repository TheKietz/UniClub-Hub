using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Constants
{
    public static class ContributionPoints
    {
        public const int TaskLow = 2;
        public const int TaskMedium = 3;
        public const int TaskHigh = 5;
        public const int EventCheckIn = 5;

        public static int ForTaskPriority(TaskPriority priority) => priority switch
        {
            TaskPriority.Low => TaskLow,
            TaskPriority.High => TaskHigh,
            _ => TaskMedium,
        };
    }
}
