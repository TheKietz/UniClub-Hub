namespace UniClub_Hub.Membership.DTOs.User
{
    public class UpdateProfileDto
    {
        public string? FullName { get; set; }
        public string? StudentId { get; set; }
        public string? Major { get; set; }
        public string? Phone { get; set; }
        public string? Gender { get; set; }
        public DateOnly? DateOfBirth { get; set; }
    }
}
