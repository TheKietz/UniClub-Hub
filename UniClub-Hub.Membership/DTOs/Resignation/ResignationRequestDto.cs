using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.DTOs.Resignation
{
    public class ResignationRequestDto
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string ClubName { get; set; } = "";
        public int MembershipId { get; set; }
        public string ClubRole { get; set; } = "";      // vai trò lúc gửi đơn
        public ResignationPreference Preference { get; set; }
        public ResignationStatus Status { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNote { get; set; }
        public string? ReviewerName { get; set; }

        // Chỉ có khi SUPER_ADMIN/CLUB_ADMIN xem danh sách
        public string? UserId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? StudentId { get; set; }
    }
}
