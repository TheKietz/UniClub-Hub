namespace UniClub_Hub.Membership.DTOs.Membership
{
    public class MemberFieldDef
    {
        public string Id { get; set; } = null!;
        public string Label { get; set; } = null!;
        public string Type { get; set; } = "text"; // text | textarea | select
        public bool Required { get; set; }
        public List<string>? Options { get; set; }
    }
}
