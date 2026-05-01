using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class CloudinaryStorageService : IFileStorageService
    {
        private readonly Cloudinary _cloudinary;

        private static readonly string[] AllowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        private static readonly string[] AllowedFileTypes = ["application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5MB

        public CloudinaryStorageService(IConfiguration config)
        {
            var account = new Account(
                config["Cloudinary:CloudName"],
                config["Cloudinary:ApiKey"],
                config["Cloudinary:ApiSecret"]
            );
            _cloudinary = new Cloudinary(account) { Api = { Secure = true } };
        }

        public async Task<string?> UploadAsync(IFormFile file, string folder)
        {
            if (file == null || file.Length == 0) return null;

            if (file.Length > MaxFileSizeBytes)
                throw new InvalidOperationException("File không được vượt quá 5MB.");

            var isImage = AllowedImageTypes.Contains(file.ContentType);
            var isFile = AllowedFileTypes.Contains(file.ContentType);

            if (!isImage && !isFile)
                throw new InvalidOperationException("Chỉ chấp nhận ảnh (jpg, png, webp) hoặc tài liệu (pdf, doc, docx).");

            using var stream = file.OpenReadStream();

            if (isImage)
            {
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = $"uniclub/{folder}",
                    Transformation = new Transformation().Quality("auto").FetchFormat("auto")
                };
                var result = await _cloudinary.UploadAsync(uploadParams);

                if (result.Error != null)
                    throw new InvalidOperationException($"Upload thất bại: {result.Error.Message}");

                return result.SecureUrl.ToString();
            }
            else
            {
                var uploadParams = new RawUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = $"uniclub/{folder}"
                };
                var result = await _cloudinary.UploadAsync(uploadParams);

                if (result.Error != null)
                    throw new InvalidOperationException($"Upload thất bại: {result.Error.Message}");

                return result.SecureUrl.ToString();
            }
        }

        public async Task DeleteAsync(string? fileUrl)
        {
            if (string.IsNullOrEmpty(fileUrl)) return;

            // Extract public_id từ URL Cloudinary
            // VD: https://res.cloudinary.com/demo/image/upload/v123/uniclub/clubs/abc.jpg
            // → public_id = uniclub/clubs/abc
            var uri = new Uri(fileUrl);
            var segments = uri.AbsolutePath.Split('/');
            var uploadIndex = Array.IndexOf(segments, "upload");
            if (uploadIndex < 0) return;

            // Bỏ version (v123) nếu có
            var startIndex = uploadIndex + 1;
            if (startIndex < segments.Length && segments[startIndex].StartsWith("v"))
                startIndex++;

            var publicId = string.Join("/", segments[startIndex..]).Split('.')[0];

            await _cloudinary.DestroyAsync(new DeletionParams(publicId));
        }
    }
}
