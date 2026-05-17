namespace UniClub_Hub.Membership.DTOs.Membership
{
    public class ImportUserRowResult
    {
        public int RowNumber { get; set; }
        public string Email { get; set; } = null!;
        public string? FullName { get; set; }
        public string? StudentId { get; set; }
        public string? Major { get; set; }
        public bool IsValid { get; set; }
        public string? Error { get; set; }
    }

    public class ImportUserPreviewDto
    {
        public List<ImportUserRowResult> ValidRows { get; set; } = [];
        public List<ImportUserRowResult> InvalidRows { get; set; } = [];
        public int TotalRows { get; set; }
        public string DefaultPassword { get; set; } = "UniClub@2026";
    }

    public class ImportUserConfirmRequest
    {
        public List<ImportUserRowResult> Rows { get; set; } = [];
    }
}
