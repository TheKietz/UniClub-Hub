using Microsoft.AspNetCore.Http;

namespace UniClub_Hub.Shared.Common.Storage
{
    public static class UploadValidation
    {
        public const long MaxFileBytes = 5 * 1024 * 1024;

        public static readonly HashSet<string> ImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        };

        public static readonly HashSet<string> ApplicationFileContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };

        public static void EnsureFile(IFormFile file, IReadOnlySet<string> allowedTypes, long maxBytes = MaxFileBytes)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("File không hợp lệ hoặc rỗng.");

            if (file.Length > maxBytes)
                throw new InvalidOperationException($"File vượt quá giới hạn {maxBytes / 1024 / 1024}MB.");

            if (!allowedTypes.Contains(file.ContentType))
                throw new InvalidOperationException("Loại file không được phép.");
        }
    }
}
