namespace UniClub_Hub.Membership.DTOs.Membership
{
    public class ImportRowResult
    {
        public int RowNumber { get; set; }
        public string Email { get; set; } = null!;
        public string? FullName { get; set; }
        public string ClubRole { get; set; } = "MEMBER";
        public string? DepartmentName { get; set; }
        public bool IsValid { get; set; }
        public string? Error { get; set; }
    }

    public class ImportPreviewDto
    {
        public List<ImportRowResult> ValidRows { get; set; } = [];
        public List<ImportRowResult> InvalidRows { get; set; } = [];
        public int TotalRows { get; set; }
    }

    public class ImportConfirmRequest
    {
        public List<ImportRowRequest> Rows { get; set; } = [];
    }

    public class ImportRowRequest
    {
        public string Email { get; set; } = null!;
        public string ClubRole { get; set; } = "MEMBER";
        public string? DepartmentName { get; set; }
    }

    public class ImportResultDto
    {
        public int Imported { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = [];
    }
}
