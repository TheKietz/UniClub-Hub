using System.ComponentModel.DataAnnotations;

namespace UniClub_Hub.Operations.DTOs.Event
{
    public class RegisterMemberDto
    {
        [Required]
        public string UserId { get; set; } = null!;
        public string? Note { get; set; }
    }
}
