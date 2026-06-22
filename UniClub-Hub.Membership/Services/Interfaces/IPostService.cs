using Microsoft.AspNetCore.Http;
using UniClub_Hub.Membership.DTOs.Post;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IPostService
    {
        Task<PostListResponse> GetByClubAsync(int clubId, int page, int pageSize, string? search, string? category, bool? isPublished);
        Task<PostResponse> GetByIdAsync(int clubId, int id);
        Task<PostResponse> CreateAsync(int clubId, string authorId, CreatePostRequest dto);
        Task<PostResponse> UpdateAsync(int clubId, int id, UpdatePostRequest dto);
        Task DeleteAsync(int clubId, int id);
        Task<PostResponse> UploadThumbnailAsync(int clubId, int id, IFormFile file);
    }
}
