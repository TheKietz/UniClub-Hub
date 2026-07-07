using Microsoft.AspNetCore.Http;
using UniClub_Hub.Membership.DTOs.Post;

namespace UniClub_Hub.Membership.Services.Interfaces
{
    public interface IPostService
    {
        // clubId == null ⇒ tin cấp trường (school-level news)
        Task<PostListResponse> GetByClubAsync(int? clubId, int page, int pageSize, string? search, string? category, string? status);
        Task<PostResponse> GetByIdAsync(int? clubId, int id);
        Task<PostResponse> CreateAsync(int? clubId, string authorId, CreatePostRequest dto, bool isAdmin);
        Task<PostResponse> UpdateAsync(int? clubId, int id, string userId, UpdatePostRequest dto, bool isAdmin);
        Task DeleteAsync(int? clubId, int id, string userId, bool isAdmin);
        Task<PostResponse> UploadThumbnailAsync(int? clubId, int id, IFormFile file);
        Task<PostResponse> SubmitForReviewAsync(int? clubId, int id, string userId);
        Task<PostResponse> ApprovePostAsync(int? clubId, int id, string reviewerId);
        Task<PostResponse> RejectPostAsync(int? clubId, int id, string reviewerId, string? note);
        // Admin (school-level) publish toggle — không qua workflow duyệt.
        Task<PostResponse> SetPublishStateAsync(int? clubId, int id, bool published, string actorId);
    }
}
