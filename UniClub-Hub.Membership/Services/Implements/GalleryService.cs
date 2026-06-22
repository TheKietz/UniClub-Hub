using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Gallery;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class GalleryService(UniClubDbContext db, IFileStorageService storage) : IGalleryService
    {
        public async Task<IEnumerable<GalleryItemResponse>> GetByClubAsync(int clubId)
        {
            return await db.MediaGalleries
                .Where(g => g.ClubId == clubId)
                .OrderByDescending(g => g.Id)
                .Select(g => ToResponse(g))
                .ToListAsync();
        }

        public async Task<IEnumerable<GalleryItemResponse>> UploadImagesAsync(int clubId, IList<IFormFile> files)
        {
            if (!await db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var results = new List<GalleryItemResponse>();

            foreach (var file in files)
            {
                var url = await storage.UploadAsync(file, "gallery");
                if (url == null) continue;

                var item = new MediaGallery
                {
                    ClubId = clubId,
                    MediaUrl = url,
                    MediaType = Shared.Enums.MediaType.Image,
                };
                db.MediaGalleries.Add(item);
                await db.SaveChangesAsync();
                results.Add(ToResponse(item));
            }

            return results;
        }

        public async Task<GalleryItemResponse> AddVideoAsync(int clubId, AddVideoRequest dto)
        {
            if (!await db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException("Không tìm thấy CLB.");

            var item = new MediaGallery
            {
                ClubId = clubId,
                MediaUrl = dto.Url.Trim(),
                MediaType = Shared.Enums.MediaType.Video,
                Description = dto.Description?.Trim(),
            };
            db.MediaGalleries.Add(item);
            await db.SaveChangesAsync();
            return ToResponse(item);
        }

        public async Task<GalleryItemResponse> UpdateAsync(int clubId, int id, UpdateGalleryItemRequest dto)
        {
            var item = await db.MediaGalleries.FirstOrDefaultAsync(g => g.Id == id && g.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy ảnh/video.");

            item.Description = dto.Description?.Trim();
            await db.SaveChangesAsync();
            return ToResponse(item);
        }

        public async Task DeleteAsync(int clubId, int id)
        {
            var item = await db.MediaGalleries.FirstOrDefaultAsync(g => g.Id == id && g.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy ảnh/video.");

            if (item.MediaType == Shared.Enums.MediaType.Image)
                await storage.DeleteAsync(item.MediaUrl);

            db.MediaGalleries.Remove(item);
            await db.SaveChangesAsync();
        }

        private static GalleryItemResponse ToResponse(MediaGallery g) => new()
        {
            Id = g.Id,
            ClubId = g.ClubId,
            MediaUrl = g.MediaUrl,
            MediaType = g.MediaType.ToString(),
            Description = g.Description,
            EventId = g.EventId,
        };
    }
}
