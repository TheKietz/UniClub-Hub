namespace UniClub_Hub.Shared.Models
{
    public class Department
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }

        public Club Club { get; set; } = null!;
        public ICollection<ClubMembership>? Members { get; set; }
        public ICollection<ClubTask>? Tasks { get; set; }
        public ICollection<Post>? Posts { get; set; }
    }
}
