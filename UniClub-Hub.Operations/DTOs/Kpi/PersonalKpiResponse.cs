namespace UniClub_Hub.Operations.DTOs.Kpi
{
    public class PersonalKpiResponse
    {
        public string UserId { get; set; } = null!;
        public string FullName { get; set; } = string.Empty;
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int OverdueTasks { get; set; }
        public int ActiveTasks { get; set; }
        public int TodoTasks { get; set; }
        public int DoingTasks { get; set; }
        public float? TotalEstimatedHours { get; set; }
        public float? TotalActualHours { get; set; }
        public double CompletionRate { get; set; }
        public double OnTimeRate { get; set; }
        public int ProductivityScore { get; set; }
        public int HighPriorityTasks { get; set; }
        public int MediumPriorityTasks { get; set; }
        public int LowPriorityTasks { get; set; }
    }
}
