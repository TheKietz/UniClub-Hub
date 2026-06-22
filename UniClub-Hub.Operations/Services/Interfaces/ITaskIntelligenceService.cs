using UniClub_Hub.Operations.DTOs.Intelligence;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Operations.Services.Interfaces
{
    public interface ITaskIntelligenceService
    {
        /// <summary>
        /// Feature 1 – Gợi ý phân công: trả Top 3 thành viên phù hợp nhất để giao Task mới.
        /// Score = (OnTimeRate * 0.4) + (ProductivityScore * 0.3) - (ActiveWorkloadHours * 0.5)
        /// </summary>
        Task<List<AssignmentSuggestionResponse>> SuggestAssigneesAsync(
            int clubId, int departmentId, float? estimatedHours, TaskPriority priority, int? sprintId);

        /// <summary>
        /// Feature 3 – Đề xuất ưu tiên: trả Top 3 Task khẩn cấp nhất của một thành viên.
        /// UrgencyIndex = (1 / hoursToDeadline) + PriorityWeight + (dependentsWaiting * 2)
        /// </summary>
        Task<List<UrgentTaskResponse>> GetUrgentTasksAsync(
            string userId, int clubId, int? departmentId, int? sprintId);
    }
}
