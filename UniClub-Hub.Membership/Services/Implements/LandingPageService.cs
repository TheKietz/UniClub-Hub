using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.LandingPage;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class LandingPageService(UniClubDbContext db, IFileStorageService storage) : ILandingPageService
    {
        public async Task<LandingPageResponse> GetAsync(int clubId)
        {
            var lp = await db.LandingPages.FirstOrDefaultAsync(l => l.ClubId == clubId);
            return lp == null ? new LandingPageResponse() : ToResponse(lp);
        }

        public async Task<LandingPageResponse> UpsertAsync(int clubId, UpsertLandingPageRequest dto)
        {
            var lp = await db.LandingPages.FirstOrDefaultAsync(l => l.ClubId == clubId);

            if (lp == null)
            {
                lp = new LandingPage { ClubId = clubId };
                db.LandingPages.Add(lp);
            }

            lp.Introduction = dto.Introduction;
            lp.Mission = dto.Mission;
            lp.Vision = dto.Vision;

            lp.SocialLinks = dto.SocialLinks is { Count: > 0 }
                ? JsonSerializer.Serialize(dto.SocialLinks)
                : null;

            lp.LayoutSettings = dto.LayoutSettings.HasValue
                ? JsonSerializer.Serialize(dto.LayoutSettings.Value)
                : null;

            await db.SaveChangesAsync();
            return ToResponse(lp);
        }

        public async Task<string?> UploadHeroAsync(int clubId, IFormFile file)
        {
            var lp = await db.LandingPages.FirstOrDefaultAsync(l => l.ClubId == clubId);

            if (lp == null)
            {
                lp = new LandingPage { ClubId = clubId };
                db.LandingPages.Add(lp);
            }

            await storage.DeleteAsync(lp.HeroImage);
            lp.HeroImage = await storage.UploadAsync(file, "landing-pages/heroes");
            await db.SaveChangesAsync();
            return lp.HeroImage;
        }

        // ── Helper ───────────────────────────────────────────────────────────

        private static LandingPageResponse ToResponse(LandingPage lp)
        {
            Dictionary<string, string>? socialLinks = null;
            if (!string.IsNullOrEmpty(lp.SocialLinks))
            {
                try { socialLinks = JsonSerializer.Deserialize<Dictionary<string, string>>(lp.SocialLinks); }
                catch { /* ignore malformed */ }
            }

            JsonElement? layoutSettings = null;
            if (!string.IsNullOrEmpty(lp.LayoutSettings))
            {
                try { layoutSettings = JsonSerializer.Deserialize<JsonElement>(lp.LayoutSettings); }
                catch { /* ignore malformed */ }
            }

            return new LandingPageResponse
            {
                HeroImage = lp.HeroImage,
                Introduction = lp.Introduction,
                Mission = lp.Mission,
                Vision = lp.Vision,
                SocialLinks = socialLinks,
                LayoutSettings = layoutSettings,
            };
        }
    }
}
