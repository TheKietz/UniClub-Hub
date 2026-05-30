namespace UniClub_Hub.Operations.DTOs.Kpi
{
    public class DepartmentKpiResponse
    {
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public double DeptCompletionRate { get; set; }
        public List<DepartmentMemberKpiRow> Members { get; set; } = [];
    }
}
