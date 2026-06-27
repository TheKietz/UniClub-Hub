using UniClub_Hub.Membership.DTOs.Pipeline;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IPipelineService
    {
        Task<IEnumerable<PipelineStageDto>> GetStagesAsync(int clubId);
        Task<PipelineStageDto> CreateStageAsync(int clubId, CreatePipelineStageRequest req, string requesterUserId, bool isSuperAdmin);
        Task<PipelineStageDto> UpdateStageAsync(int clubId, int stageId, UpdatePipelineStageRequest req, string requesterUserId, bool isSuperAdmin);
        Task DeleteStageAsync(int clubId, int stageId, string requesterUserId, bool isSuperAdmin);
        Task ReorderAsync(int clubId, ReorderStagesRequest req, string requesterUserId, bool isSuperAdmin);
    }
}
