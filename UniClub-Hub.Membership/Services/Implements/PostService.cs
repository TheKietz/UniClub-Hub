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
            int clubId, int page, int pageSize, string? search, string? category, bool? isPublished)
        {
            var query = db.Posts
                .Include(p => p.Author)
                .Include(p => p.Department)
                .Where(p => p.ClubId == clubId)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p => p.Title.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(category)
                && Enum.TryParse<PostCategory>(category, true, out var cat))
                query = query.Where(p => p.Category == cat);

            if (isPublished.HasValue)
                query = query.Where(p => p.IsPublished == isPublished.Value);

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

        public async Task<PostResponse> GetByIdAsync(int clubId, int id)
        {
            var post = await db.Posts
                .Include(p => p.Author)
                .Include(p => p.Department)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            return ToResponse(post);
        }

        public async Task<PostResponse> CreateAsync(int clubId, string authorId, CreatePostRequest dto)
        {
            if (!await db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var post = new Post
            {
                ClubId = clubId,
                AuthorId = authorId,
                Title = dto.Title.Trim(),
                Content = dto.Content,
                Category = dto.Category,
                IsPublished = dto.IsPublished,
                DepartmentId = dto.DepartmentId,
                CreatedAt = DateTime.UtcNow,
            };

            db.Posts.Add(post);
            await db.SaveChangesAsync();

            return await GetByIdAsync(clubId, post.Id);
        }

        public async Task<PostResponse> UpdateAsync(int clubId, int id, UpdatePostRequest dto)
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            post.Title = dto.Title.Trim();
            post.Content = dto.Content;
            post.Category = dto.Category;
            post.IsPublished = dto.IsPublished;
            post.DepartmentId = dto.DepartmentId;

            await db.SaveChangesAsync();
            return await GetByIdAsync(clubId, id);
        }

        public async Task DeleteAsync(int clubId, int id)
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id && p.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy bài viết.");

            if (post.ThumbnailUrl != null)
                await storage.DeleteAsync(post.ThumbnailUrl);

            db.Posts.Remove(post);
            await db.SaveChangesAsync();
        }

        public async Task<PostResponse> UploadThumbnailAsync(int clubId, int id, IFormFile file)
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

        private static PostResponse ToResponse(Post p) => new()
        {
            Id = p.Id,
            ClubId = p.ClubId,
            Title = p.Title,
            Content = p.Content,
            ThumbnailUrl = p.ThumbnailUrl,
            Category = p.Category.ToString(),
            IsPublished = p.IsPublished,
            CreatedAt = p.CreatedAt,
            AuthorName = p.Author?.FullName ?? p.Author?.Email ?? "",
            DepartmentId = p.DepartmentId,
            DepartmentName = p.Department?.Name,
        };
    }
}
