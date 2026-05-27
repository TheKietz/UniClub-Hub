namespace UniClub_Hub.Membership.DTOs.Application
{
    public class SubmitApplicationDto
    {
        public Dictionary<string, string?>? Answers { get; set; }
        public Dictionary<string, string?>? MemberFieldData { get; set; }
    }
}
