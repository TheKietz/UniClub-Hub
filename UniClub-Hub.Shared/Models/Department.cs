using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Shared.Models
{
    public class Department : IAuditable, ISoftDeletable
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }

        // IAuditable
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        // ISoftDeletable
        public bool IsDeleted { get; set; } = false;
        public string? DeletedBy { get; set; }

        public Club Club { get; set; } = null!;
        public ICollection<ClubMembership>? Members { get; set; }
        public ICollection<ClubTask>? Tasks { get; set; }
        public ICollection<Post>? Posts { get; set; }
        public ICollection<ClubPosition>? Positions { get; set; }
    }
}
