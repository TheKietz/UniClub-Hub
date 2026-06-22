using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace UniClub_Hub.Shared.Common.Storage
{
    public class CloudinaryStorageService : IFileStorageService
    {
        private readonly Cloudinary _cloudinary;

        private static readonly string[] ImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

        public CloudinaryStorageService(Cloudinary cloudinary)
        {
            _cloudinary = cloudinary;
        }

        // public CloudinaryStorageService(IConfiguration config)
        // {
        //     var account = new Account(
        //         config["Cloudinary:CloudName"],
        //         config["Cloudinary:ApiKey"],
        //         config["Cloudinary:ApiSecret"]
        //     );
        //     _cloudinary = new Cloudinary(account) { Api = { Secure = true } };
        // }

        public async Task<string?> UploadAsync(IFormFile file, string folder)
        {
            if (file == null || file.Length == 0) return null;

            using var stream = file.OpenReadStream();

            if (ImageTypes.Contains(file.ContentType))
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

            // 1. Trích xuất public_id từ URL Cloudinary
            var uri = new Uri(fileUrl);
            var segments = uri.AbsolutePath.Split('/');
            var uploadIndex = Array.IndexOf(segments, "upload");
            if (uploadIndex < 0) return;

            var startIndex = uploadIndex + 1;
            if (startIndex < segments.Length && segments[startIndex].StartsWith("v"))
                startIndex++;

            // Lấy tên file có đuôi để check loại file trước khi cắt đuôi
            var fileWithExtension = segments[^1]; 
            var publicId = string.Join("/", segments[startIndex..]).Split('.')[0];

            // 2. Xác định ResourceType (Mặc định là Image, nếu đuôi không thuộc ImageTypes thì chỉnh thành Raw)
            var extension = Path.GetExtension(fileWithExtension).ToLower();
            var isImage = extension == ".jpg" || extension == ".jpeg" || extension == ".png" || extension == ".webp" || extension == ".gif";

            var deletionParams = new DeletionParams(publicId)
            {
                ResourceType = isImage ? ResourceType.Image : ResourceType.Raw // Fix triệt để lỗi không xóa được file tài liệu
            };

            var result = await _cloudinary.DestroyAsync(deletionParams);
            
            if (result.Result != "ok" && result.Result != "not found")
            {
                throw new InvalidOperationException($"Xóa file trên Cloudinary thất bại: {result.Error?.Message ?? result.Result}");
            }
        }
    }
}
