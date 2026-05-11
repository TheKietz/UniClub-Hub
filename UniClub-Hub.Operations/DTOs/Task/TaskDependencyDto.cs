namespace UniClub_Hub.Operations.DTOs.Task
{
    public class TaskDependencyDto
    {
        public int DependsOnTaskId { get; set; }
        public string Title { get; set; } = null!;
        public string Status { get; set; } = null!;
    }
}
