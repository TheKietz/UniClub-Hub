namespace UniClub_Hub.Operations.DTOs.Task
{
    public class TaskCommentDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string UserId { get; set; } = null!;
        public string UserName { get; set; } = null!;
        public string? UserAvatarUrl { get; set; }
        public string Content { get; set; } = null!;
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
        public bool IsEdited { get; set; }
    }

    public class CreateTaskCommentDto
    {
        public string Content { get; set; } = null!;
    }

    public class UpdateTaskCommentDto
    {
        public string Content { get; set; } = null!;
    }
}
