using Microsoft.AspNetCore.Identity;

namespace UniClub_Hub.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? StudentId { get; set; }     // Mã sinh viên
        public string? FullName { get; set; }      // Họ tên đầy đủ
        public string? Major { get; set; }         // Chuyên ngành
        public string? AvatarUrl { get; set; }     // Ảnh đại diện

        // Liên kết với các bảng khác của 3 đề tài
        // Ví dụ: Một User có thể tham gia nhiều CLB (Đề tài 1)
        public ICollection<Club>? Clubs { get; set; }
    }
}
