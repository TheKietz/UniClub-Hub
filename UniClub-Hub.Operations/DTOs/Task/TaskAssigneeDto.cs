namespace UniClub_Hub.Operations.DTOs.Task
{
    public class TaskAssigneeDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string UserId { get; set; } = null!;
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime AssignedAt { get; set; }
        public string? AssignedBy { get; set; }
    }

    public class AssignTaskDto
    {
        public string UserId { get; set; } = null!;
    }
}
