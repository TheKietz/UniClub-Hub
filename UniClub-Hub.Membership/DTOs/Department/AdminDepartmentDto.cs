namespace UniClub_Hub.Membership.DTOs.Department
{
    public class AdminDepartmentDto : DepartmentDto
    {
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
        public string? DeletedBy { get; set; }
        public bool IsDeleted { get; set; }
    }
}
