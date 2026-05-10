namespace UniClub_Hub.Shared.Models
{
    public class TaskDependency
    {
        public int TaskId { get; set; }
        public int DependsOnTaskId { get; set; }

        // PK composite (TaskId, DependsOnTaskId)
        // TaskId phải Done sau khi DependsOnTaskId Done

        public ClubTask Task { get; set; } = null!;
        public ClubTask DependsOnTask { get; set; } = null!;
    }
}
