using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Shared.Models
{
    public class ClubPosition : IAuditable, ISoftDeletable
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? DepartmentId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public bool CanBeAssignedByDeptLead { get; set; } = true;

        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        public bool IsDeleted { get; set; }
        public string? DeletedBy { get; set; }

        public Club Club { get; set; } = null!;
        public Department? Department { get; set; }
        public ICollection<ClubPositionPermission>? Permissions { get; set; }
        public ICollection<ClubMemberPosition>? MemberPositions { get; set; }
    }
}
