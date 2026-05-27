using UniClub_Hub.Membership.DTOs.Pipeline;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IPipelineService
    {
        Task<IEnumerable<PipelineStageDto>> GetStagesAsync(int clubId);
        Task<PipelineStageDto> CreateStageAsync(int clubId, CreatePipelineStageRequest req);
        Task<PipelineStageDto> UpdateStageAsync(int clubId, int stageId, UpdatePipelineStageRequest req);
        Task DeleteStageAsync(int clubId, int stageId);
        Task ReorderAsync(int clubId, ReorderStagesRequest req);
    }
}
