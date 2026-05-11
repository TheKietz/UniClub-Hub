using UniClub_Hub.Shared.Common;
namespace UniClub_Hub.Shared.Models
{
    public class Category
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }

        public ICollection<Club>? Clubs { get; set; }
    }
}
