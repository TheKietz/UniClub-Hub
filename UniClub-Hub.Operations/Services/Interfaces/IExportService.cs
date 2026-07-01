namespace UniClub_Hub.Operations.Services.Interfaces
{
    /// <summary>
    /// Generates downloadable reports (Excel/PDF) for the Operations module.
    /// Each method returns the file bytes plus the HTTP content-type and a suggested file name.
    /// </summary>
    public interface IExportService
    {
        Task<(byte[] Content, string ContentType, string FileName)> ExportTasksAsync(
            int clubId, DateTime? from, DateTime? to, string format, string requesterId);

        Task<(byte[] Content, string ContentType, string FileName)> ExportDepartmentKpiAsync(
            int departmentId, int clubId, DateTime? from, DateTime? to, string requesterId);

        Task<(byte[] Content, string ContentType, string FileName)> ExportAuditLogsAsync(
            int clubId, DateTime? from, DateTime? to, string requesterId);
    }
}
