using Microsoft.AspNetCore.Http;

namespace UniClub_Hub.Shared.Common
{
    public interface IFileStorageService
    {
        /// <summary>Upload file, trả về URL public để lưu vào DB</summary>
        Task<string?> UploadAsync(IFormFile file, string folder);

        /// <summary>Xóa file cũ khi thay ảnh mới</summary>
        Task DeleteAsync(string? publicId);
    }
}
