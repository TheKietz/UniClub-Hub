using UniClub_Hub.Shared.Common;
namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IExportService
    {
        Task<(byte[] Content, string ContentType, string FileName)> ExportMembersAsync(int clubId, string format);
        Task<(byte[] Content, string ContentType, string FileName)> ExportApplicationsAsync(int clubId, string? status, string format);
    }
}
