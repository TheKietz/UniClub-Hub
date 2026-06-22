namespace UniClub_Hub.Membership.DTOs.Pipeline
{
    public class PipelineStageDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public int StageOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreatePipelineStageRequest
    {
        public string Name { get; set; } = null!;
        public int StageOrder { get; set; }
    }

    public class UpdatePipelineStageRequest
    {
        public string? Name { get; set; }
        public int? StageOrder { get; set; }
        public bool? IsActive { get; set; }
    }

    public class ReorderStagesRequest
    {
        public List<int> StageIds { get; set; } = [];
    }

    public class AdvanceApplicationRequest
    {
        public string? ReviewNote { get; set; }
    }
}
