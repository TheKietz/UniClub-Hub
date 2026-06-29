namespace UniClub_Hub.Shared.Enums
{
    public enum NotificationType
    {
        Task,
        Event,
        Application,
        System,
        TaskAssigned,      // được giao công việc
        TaskStatusUpdated, // công việc thay đổi trạng thái
        DeadlineReminder,  // nhắc việc sắp đến hạn
        AssignmentReceived // CLB nhận phiếu giao việc từ Trường
    }
}
