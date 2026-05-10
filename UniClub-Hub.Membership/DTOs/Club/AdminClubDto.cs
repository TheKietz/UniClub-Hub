namespace UniClub_Hub.Membership.DTOs.Club
{
    public class AdminClubDto : ClubDto
    {
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
        public string? DeletedBy { get; set; }
        public bool IsDeleted { get; set; }
    }
}
