namespace UniClub_Hub.Operations.DTOs.Event
{
    public class EventAttachmentDto
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string UploadedBy { get; set; } = null!;
        public string UploaderName { get; set; } = null!;
        public string FileUrl { get; set; } = null!;
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public long? FileSize { get; set; }
        public string? Note { get; set; }
        public DateTimeOffset UploadedAt { get; set; }
    }
}
