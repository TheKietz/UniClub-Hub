namespace UniClub_Hub.Shared.Constants;

public static class SignalREvents
{
    public const string TaskStatusUpdated = "TaskStatusUpdated";
    public const string TaskCreated      = "TaskCreated";
    public const string TaskDeleted      = "TaskDeleted";
}

public static class SignalRGroups
{
    public static string Club(int clubId) => $"club_{clubId}";
}
