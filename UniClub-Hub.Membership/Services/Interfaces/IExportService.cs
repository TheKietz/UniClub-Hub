using UniClub_Hub.Shared.Common;
namespace UniClub_Hub.Membership.Services.Interfaces
{
    using UniClub_Hub.Membership.DTOs.Common;

    public interface IExportService
    {
        Task<(byte[] Content, string ContentType, string FileName)> ExportMembersAsync(
            int clubId,
            string format,
            string requesterUserId,
            bool isSuperAdmin,
            MemberListQuery? query = null);
        Task<(byte[] Content, string ContentType, string FileName)> ExportApplicationsAsync(
            int clubId,
            string? status,
            string format,
            string requesterUserId,
            bool isSuperAdmin,
            ApplicationListQuery? query = null);
        Task<(byte[] Content, string ContentType, string FileName)> ExportAllUsersAsync(string format, UserListQuery? query = null);
        Task<(byte[] Content, string ContentType, string FileName)> ExportAllClubsAsync(string format, AdminClubListQuery? query = null);
    }
}
