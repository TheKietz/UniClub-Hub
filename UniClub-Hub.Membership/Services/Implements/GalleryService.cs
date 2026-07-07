using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Gallery;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class GalleryService(UniClubDbContext db, IFileStorageService storage) : IGalleryService
    {
        // Public: only published items
        public async Task<IEnumerable<GalleryItemResponse>> GetByClubAsync(int clubId, bool publishedOnly = true)
        {
            var query = db.MediaGalleries
                .Include(g => g.UploadedBy)
                .Where(g => g.ClubId == clubId);

            if (publishedOnly)
                query = query.Where(g => g.Status == MediaStatus.Published);

            return await query
                .OrderByDescending(g => g.UploadedAt)
                .Select(g => ToResponse(g))
                .ToListAsync();
        }

        // Management: all statuses
        public async Task<IEnumerable<GalleryItemResponse>> GetAllForManageAsync(int clubId)
        {
            return await db.MediaGalleries
                .Include(g => g.UploadedBy)
                .Where(g => g.ClubId == clubId)
                .OrderByDescending(g => g.UploadedAt)
                .Select(g => ToResponse(g))
                .ToListAsync();
        }

        public async Task<IEnumerable<GalleryItemResponse>> UploadImagesAsync(
            int clubId, string uploaderId, bool isAdmin, IList<IFormFile> files, string? description)
        {
            if (!await db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var status = isAdmin ? MediaStatus.Published : MediaStatus.PendingReview;
            var results = new List<GalleryItemResponse>();

            foreach (var file in files)
            {
                var url = await storage.UploadAsync(file, "gallery");
                if (url == null) continue;

                var item = new MediaGallery
                {
                    ClubId = clubId,
                    MediaUrl = url,
                    MediaType = MediaType.Image,
                    Description = description?.Trim(),
                    Status = status,
                    UploadedById = uploaderId,
                    UploadedAt = DateTime.UtcNow,
                };
                db.MediaGalleries.Add(item);
                await db.SaveChangesAsync();

                await db.Entry(item).Reference(i => i.UploadedBy).LoadAsync();
                results.Add(ToResponse(item));
            }

            return results;
        }

        public async Task<GalleryItemResponse> UploadVideoAsync(
            int clubId, string uploaderId, bool isAdmin, IFormFile file, string? description)
        {
            if (!await db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var url = await storage.UploadAsync(file, "gallery")
                ?? throw new InvalidOperationException("Upload video thất bại.");

            var status = isAdmin ? MediaStatus.Published : MediaStatus.PendingReview;

            var item = new MediaGallery
            {
                ClubId = clubId,
                MediaUrl = url,
                MediaType = MediaType.Video,
                Description = description?.Trim(),
                Status = status,
                UploadedById = uploaderId,
                UploadedAt = DateTime.UtcNow,
            };
            db.MediaGalleries.Add(item);
            await db.SaveChangesAsync();

            await db.Entry(item).Reference(i => i.UploadedBy).LoadAsync();
            return ToResponse(item);
        }

        public async Task<GalleryItemResponse> AddVideoAsync(int clubId, AddVideoRequest dto)
        {
            if (!await db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var item = new MediaGallery
            {
                ClubId = clubId,
                MediaUrl = dto.Url.Trim(),
                MediaType = MediaType.Video,
                Description = dto.Description?.Trim(),
                Status = MediaStatus.Published,
                UploadedAt = DateTime.UtcNow,
            };
            db.MediaGalleries.Add(item);
            await db.SaveChangesAsync();
            return ToResponse(item);
        }

        public async Task<GalleryItemResponse> UpdateAsync(int clubId, int id, UpdateGalleryItemRequest dto)
        {
            var item = await db.MediaGalleries
                .Include(g => g.UploadedBy)
                .FirstOrDefaultAsync(g => g.Id == id && g.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy ảnh/video.");

            item.Description = dto.Description?.Trim();
            await db.SaveChangesAsync();
            return ToResponse(item);
        }

        public async Task DeleteAsync(int clubId, int id, string requesterId, bool isAdmin)
        {
            var item = await db.MediaGalleries.FirstOrDefaultAsync(g => g.Id == id && g.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy ảnh/video.");

            // DEPT_LEAD can only delete their own pending items
            if (!isAdmin && item.UploadedById != requesterId)
                throw new UnauthorizedAccessException("Không có quyền xóa ảnh/video này.");

            if (!isAdmin && item.Status == MediaStatus.Published)
                throw new InvalidOperationException("Không thể xóa ảnh/video đã được duyệt.");

            if (item.MediaType == MediaType.Image)
                await storage.DeleteAsync(item.MediaUrl);

            db.MediaGalleries.Remove(item);
            await db.SaveChangesAsync();
        }

        public async Task<GalleryItemResponse> ApproveAsync(int clubId, int id, string reviewerId)
        {
            var item = await db.MediaGalleries
                .Include(g => g.UploadedBy)
                .FirstOrDefaultAsync(g => g.Id == id && g.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy ảnh/video.");

            if (item.Status != MediaStatus.PendingReview)
                throw new InvalidOperationException("Ảnh/video này không ở trạng thái chờ duyệt.");

            item.Status = MediaStatus.Published;
            item.ReviewerId = reviewerId;
            item.ReviewedAt = DateTime.UtcNow;
            item.ReviewNote = null;

            await db.SaveChangesAsync();
            return ToResponse(item);
        }

        public async Task<GalleryItemResponse> RejectAsync(int clubId, int id, string reviewerId, string? note)
        {
            var item = await db.MediaGalleries
                .Include(g => g.UploadedBy)
                .FirstOrDefaultAsync(g => g.Id == id && g.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy ảnh/video.");

            if (item.Status != MediaStatus.PendingReview)
                throw new InvalidOperationException("Ảnh/video này không ở trạng thái chờ duyệt.");

            item.Status = MediaStatus.Rejected;
            item.ReviewerId = reviewerId;
            item.ReviewedAt = DateTime.UtcNow;
            item.ReviewNote = note?.Trim();

            await db.SaveChangesAsync();
            return ToResponse(item);
        }

        private static GalleryItemResponse ToResponse(MediaGallery g) => new()
        {
            Id = g.Id,
            ClubId = g.ClubId,
            MediaUrl = g.MediaUrl,
            MediaType = g.MediaType.ToString(),
            Description = g.Description,
            EventId = g.EventId,
            Status = g.Status.ToString(),
            UploadedById = g.UploadedById,
            UploadedByName = g.UploadedBy?.FullName,
            ReviewNote = g.ReviewNote,
            ReviewedAt = g.ReviewedAt.HasValue
                ? DateTime.SpecifyKind(g.ReviewedAt.Value, DateTimeKind.Utc)
                : null,
            UploadedAt = DateTime.SpecifyKind(g.UploadedAt, DateTimeKind.Utc),
        };
    }
}
