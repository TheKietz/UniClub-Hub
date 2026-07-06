namespace UniClub_Hub.Shared.Constants;

public static class SignalREvents
{
    public const string TaskStatusUpdated  = "TaskStatusUpdated";
    public const string TaskCreated        = "TaskCreated";
    public const string TaskDeleted        = "TaskDeleted";
    public const string EventTasksCleaned  = "EventTasksCleaned";  // broadcast when cascade-delete fires
    public const string NotificationReceived = "NotificationReceived";  // per-user in-app notification
    public const string CommentAdded         = "CommentAdded";          // new comment on a task
    public const string AttachmentUploaded   = "AttachmentUploaded";    // new attachment on a task
    public const string SprintStatusChanged  = "SprintStatusChanged";   // sprint status transition
    public const string AssignmentReceived   = "AssignmentReceived";    // club received a new work assignment
}

public static class SignalRGroups
{
    public static string Club(int clubId) => $"club_{clubId}";
}
