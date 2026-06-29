using Microsoft.AspNetCore.Http;
using UniClub_Hub.Membership.DTOs.Gallery;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IGalleryService
    {
        Task<IEnumerable<GalleryItemResponse>> GetByClubAsync(int clubId);
        Task<IEnumerable<GalleryItemResponse>> UploadImagesAsync(int clubId, IList<IFormFile> files, string? description);
        Task<GalleryItemResponse> UploadVideoAsync(int clubId, IFormFile file, string? description);
        Task<GalleryItemResponse> AddVideoAsync(int clubId, AddVideoRequest dto);
        Task<GalleryItemResponse> UpdateAsync(int clubId, int id, UpdateGalleryItemRequest dto);
        Task DeleteAsync(int clubId, int id);
    }
}
