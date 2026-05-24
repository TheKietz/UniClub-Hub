using System.ComponentModel.DataAnnotations.Schema;

namespace UniClub_Hub.Shared.Models
{
    [Table("ClubPipelineStages")]
    public class ClubPipelineStage
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string Name { get; set; } = null!;
        public int StageOrder { get; set; }
        public bool IsActive { get; set; } = true;

        public Club Club { get; set; } = null!;
        public ICollection<ClubApplication>? Applications { get; set; }
    }
}
