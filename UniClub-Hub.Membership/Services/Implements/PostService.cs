using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Post;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class PostService(UniClubDbContext db, IFileStorageService storage) : IPostService
    {
        public async Task<PostListResponse> GetByClubAsync(
            int? clubId, int page, int pageSize, string? search, string? category, string? status)
        {
            var query = db.Posts
                .Include(p => p.Club)
                .Include(p => p.Author)
                .Include(p => p.Reviewer)
                .Include(p => p.Department)
                .AsNoTracking();

            // clubId == null ⇒ tin cấp trường; dùng nhánh tường minh để EF sinh "IS NULL".
            query = clubId == null
                ? query.Where(p => p.ClubId == null)
                : query.Where(p => p.ClubId == clubId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p => p.Title.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(category)
                && Enum.TryParse<PostCategory>(category, true, out var cat))
                query = query.Where(p => p.Category == cat);

            if (!string.IsNullOrWhiteSpace(status)
                && Enum.TryParse<PostStatus>(status, true, out var st))
                query = query.Where(p => p.Status == st);

            var total = await query.CountAsync();
            var posts = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PostListResponse
            {
                Data = posts.Select(ToResponse),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
            };
        }

        public async Task<PostResponse> GetByIdAsync(int? clubId, int id)
        {
            var post = await db.Posts
                .Include(p => p.Club)
                .Include(p => p.Author)
                .Include(p => p.Reviewer)
                .Include(p => p.Department)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            return ToResponse(post);
        }

        public async Task<PostResponse> CreateAsync(int? clubId, string authorId, CreatePostRequest dto, bool isAdmin)
        {
            if (clubId != null && !await db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var status = isAdmin && dto.PublishDirectly ? PostStatus.Published : PostStatus.Draft;

            var post = new Post
            {
                ClubId = clubId,
                AuthorId = authorId,
                Title = dto.Title.Trim(),
                Content = dto.Content,
                Category = dto.Category,
                Status = status,
                DepartmentId = clubId == null ? null : dto.DepartmentId,
                CreatedAt = DateTime.UtcNow,
            };

            db.Posts.Add(post);
            await db.SaveChangesAsync();

            return await GetByIdAsync(clubId, post.Id);
        }

        public async Task<PostResponse> UpdateAsync(int? clubId, int id, string userId, UpdatePostRequest dto, bool isAdmin)
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            if (!isAdmin && post.AuthorId != userId)
                throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa bài viết này.");

            if (!isAdmin && post.Status == PostStatus.Published)
                throw new InvalidOperationException("Không thể chỉnh sửa bài viết đã xuất bản.");

            post.Title = dto.Title.Trim();
            post.Content = dto.Content;
            post.Category = dto.Category;
            post.DepartmentId = clubId == null ? null : dto.DepartmentId;

            // Editing a rejected post resets it to draft
            if (post.Status == PostStatus.Rejected)
                post.Status = PostStatus.Draft;

            await db.SaveChangesAsync();
            return await GetByIdAsync(clubId, id);
        }

        public async Task DeleteAsync(int? clubId, int id, string userId, bool isAdmin)
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            if (!isAdmin && post.AuthorId != userId)
                throw new UnauthorizedAccessException("Bạn không có quyền xóa bài viết này.");

            if (!isAdmin && post.Status == PostStatus.Published)
                throw new InvalidOperationException("Không thể xóa bài viết đã xuất bản.");

            if (post.ThumbnailUrl != null)
                await storage.DeleteAsync(post.ThumbnailUrl);

            db.Posts.Remove(post);
            await db.SaveChangesAsync();
        }

        public async Task<PostResponse> UploadThumbnailAsync(int? clubId, int id, IFormFile file)
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            var old = post.ThumbnailUrl;
            var url = await storage.UploadAsync(file, "posts")
                ?? throw new InvalidOperationException("Upload ảnh thất bại.");

            post.ThumbnailUrl = url;
            await db.SaveChangesAsync();

            if (old != null) await storage.DeleteAsync(old);

            return await GetByIdAsync(clubId, id);
        }

        public async Task<PostResponse> SubmitForReviewAsync(int? clubId, int id, string userId)
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            if (post.AuthorId != userId)
                throw new UnauthorizedAccessException("Chỉ tác giả mới có thể gửi bài để duyệt.");

            if (post.Status != PostStatus.Draft && post.Status != PostStatus.Rejected)
                throw new InvalidOperationException("Chỉ bản nháp hoặc bị từ chối mới có thể gửi để duyệt.");

            post.Status = PostStatus.PendingReview;
            await db.SaveChangesAsync();
            return await GetByIdAsync(clubId, id);
        }

        public async Task<PostResponse> ApprovePostAsync(int? clubId, int id, string reviewerId)
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            if (post.Status != PostStatus.PendingReview)
                throw new InvalidOperationException("Chỉ bài đang chờ duyệt mới có thể phê duyệt.");

            post.Status = PostStatus.Published;
            post.ReviewerId = reviewerId;
            post.ReviewedAt = DateTime.UtcNow;
            post.ReviewNote = null;
            await db.SaveChangesAsync();
            return await GetByIdAsync(clubId, id);
        }

        public async Task<PostResponse> RejectPostAsync(int? clubId, int id, string reviewerId, string? note)
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            if (post.Status != PostStatus.PendingReview)
                throw new InvalidOperationException("Chỉ bài đang chờ duyệt mới có thể từ chối.");

            post.Status = PostStatus.Rejected;
            post.ReviewerId = reviewerId;
            post.ReviewedAt = DateTime.UtcNow;
            post.ReviewNote = note;
            await db.SaveChangesAsync();
            return await GetByIdAsync(clubId, id);
        }

        public async Task<PostResponse> SetPublishStateAsync(int? clubId, int id, bool published, string actorId)
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            post.Status = published ? PostStatus.Published : PostStatus.Draft;
            post.ReviewerId = published ? actorId : null;
            post.ReviewedAt = published ? DateTime.UtcNow : null;
            post.ReviewNote = null;
            await db.SaveChangesAsync();
            return await GetByIdAsync(clubId, id);
        }

        private static PostResponse ToResponse(Post p) => new()
        {
            Id = p.Id,
            ClubId = p.ClubId,
            ClubName = p.Club?.Name,
            Title = p.Title,
            Content = p.Content,
            ThumbnailUrl = p.ThumbnailUrl,
            Category = p.Category.ToString(),
            Status = p.Status.ToString(),
            ReviewNote = p.ReviewNote,
            ReviewerName = p.Reviewer?.FullName ?? p.Reviewer?.Email,
            ReviewedAt = p.ReviewedAt,
            CreatedAt = p.CreatedAt,
            AuthorId = p.AuthorId,
            AuthorName = p.Author?.FullName ?? p.Author?.Email ?? "",
            DepartmentId = p.DepartmentId,
            DepartmentName = p.Department?.Name,
        };
    }
}
