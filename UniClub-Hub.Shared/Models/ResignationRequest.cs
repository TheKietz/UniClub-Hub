using System.ComponentModel.DataAnnotations.Schema;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    [Table("ResignationRequests")]
    public class ResignationRequest
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public int ClubId { get; set; }
        public int MembershipId { get; set; }
        public ResignationPreference Preference { get; set; }
        public ResignationStatus Status { get; set; } = ResignationStatus.Pending;
        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewerId { get; set; }
        public string? ReviewNote { get; set; }

        public ApplicationUser User { get; set; } = null!;
        public Club Club { get; set; } = null!;
        public ClubMembership Membership { get; set; } = null!;
    }
}
