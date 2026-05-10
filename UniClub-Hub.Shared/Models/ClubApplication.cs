using UniClub_Hub.Shared.Common;
using System.ComponentModel.DataAnnotations.Schema;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Shared.Models
{
    [Table("Applications")]
    public class ClubApplication
    {
        public int Id { get; set; }
        public string UserId { get; set; } = null!;
        public int ClubId { get; set; }
        public string? Answers { get; set; } // JSONB — câu trả lời form tuyển thành viên
        public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

        public ApplicationUser User { get; set; } = null!;
        public Club Club { get; set; } = null!;
    }
}
