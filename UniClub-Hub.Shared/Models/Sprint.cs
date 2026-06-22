using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    public class Sprint : IAuditable, ISoftDeletable
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? EventId { get; set; } // nullable — sprint can be club-level or event-scoped
        public string Name { get; set; } = null!;
        public string? Goal { get; set; }
        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset EndDate { get; set; }
        public SprintStatus Status { get; set; } = SprintStatus.Planning;
        public string? ReviewNotes { get; set; } // JSONB

        // IAuditable
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        //Deparertment table
        public int? DepartmentId { get; set; }
        public Department? Department { get; set; }


        // ISoftDeletable
        public bool IsDeleted { get; set; }
        public string? DeletedBy { get; set; }

        public Club Club { get; set; } = null!;
        public ClubEvent? Event { get; set; }
        public ICollection<ClubTask>? Tasks { get; set; }
    }
}
