using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.DTOs.Task
{
    public class UpdateTaskStatusDto
    {
        public ClubTaskStatus Status { get; set; }
        public int Progress { get; set; }
    }
}
