using Microsoft.AspNetCore.Http;
using UniClub_Hub.Membership.DTOs.Gallery;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IGalleryService
    {
        Task<IEnumerable<GalleryItemResponse>> GetByClubAsync(int clubId, bool publishedOnly = true);
        Task<IEnumerable<GalleryItemResponse>> GetAllForManageAsync(int clubId);
        Task<IEnumerable<GalleryItemResponse>> UploadImagesAsync(int clubId, string uploaderId, bool isAdmin, IList<IFormFile> files, string? description);
        Task<GalleryItemResponse> UploadVideoAsync(int clubId, string uploaderId, bool isAdmin, IFormFile file, string? description);
        Task<GalleryItemResponse> AddVideoAsync(int clubId, AddVideoRequest dto);
        Task<GalleryItemResponse> UpdateAsync(int clubId, int id, UpdateGalleryItemRequest dto);
        Task DeleteAsync(int clubId, int id, string requesterId, bool isAdmin);
        Task<GalleryItemResponse> ApproveAsync(int clubId, int id, string reviewerId);
        Task<GalleryItemResponse> RejectAsync(int clubId, int id, string reviewerId, string? note);
    }
}
