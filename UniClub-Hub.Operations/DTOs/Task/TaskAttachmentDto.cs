namespace UniClub_Hub.Operations.DTOs.Task
{
    public class TaskAttachmentDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string FileUrl { get; set; } = null!;
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public long? FileSize { get; set; }
        public string? Note { get; set; }
        public bool IsLink { get; set; }
        public DateTimeOffset UploadedAt { get; set; }
        public string UserId { get; set; } = null!;
    }

    public class AddTaskAttachmentLinkDto
    {
        public string FileUrl { get; set; } = null!;
        public string? Note { get; set; }
    }
}
