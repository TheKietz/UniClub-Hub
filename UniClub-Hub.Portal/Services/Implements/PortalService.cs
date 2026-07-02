using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Portal.DTOs;
using UniClub_Hub.Portal.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Portal.Services.Implements
{
    public class PortalService(UniClubDbContext db) : IPortalService
    {
        // ── Public club explorer ─────────────────────────────────────────────

        public async Task<ExplorePagedResult> GetExploreClubsAsync(
            string? search,
            int? categoryId,
            int page,
            int pageSize)
        {
            var query = db.Clubs
                .Include(c => c.Category)
                .Include(c => c.LandingPage)
                .Where(c => !c.IsDeleted && c.Status == ClubStatus.Active);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(term) ||
                    c.Code.ToLower().Contains(term));
            }

            if (categoryId.HasValue)
                query = query.Where(c => c.CategoryId == categoryId.Value);

            var totalCount = await query.CountAsync();

            var clubs = await query
                .OrderBy(c => c.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var memberCounts = await db.ClubMemberships
                .Where(m => clubs.Select(c => c.Id).Contains(m.ClubId)
                         && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                .GroupBy(m => m.ClubId)
                .Select(g => new { ClubId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ClubId, x => x.Count);

            var items = clubs.Select(c => new ClubExploreDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                Description = c.Description,
                LogoUrl = c.LogoUrl,
                CategoryName = c.Category?.Name,
                MemberCount = memberCounts.GetValueOrDefault(c.Id, 0),
                Status = c.Status.ToString(),
                PrimaryColor = ExtractPrimaryColor(c.LandingPage?.LayoutSettings),
            });

            return new ExplorePagedResult
            {
                Data = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
            };
        }

        // ── Full landing page bundle ─────────────────────────────────────────

        public async Task<ClubLandingDataDto> GetClubLandingPageAsync(int clubId)
        {
            var club = await db.Clubs
                .Include(c => c.Category)
                .Include(c => c.LandingPage)
                .FirstOrDefaultAsync(c => c.Id == clubId && !c.IsDeleted && c.Status == ClubStatus.Active)
                ?? throw new KeyNotFoundException("Không tìm thấy câu lạc bộ.");

            var now = DateTimeOffset.UtcNow;

            // Departments + lead name (single query via projection)
            var departments = await db.Departments
                .Where(d => d.ClubId == clubId && !d.IsDeleted)
                .Select(d => new DepartmentPublicDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    Description = d.Description,
                    MemberCount = d.Members!.Count(m =>
                        m.Status == MembershipStatus.Active ||
                        m.Status == MembershipStatus.Probation),
                    LeadName = d.Members!
                        .Where(m => m.ClubRole == ClubRole.DEPT_LEAD && m.Status == MembershipStatus.Active)
                        .Select(m => m.User.FullName)
                        .FirstOrDefault(),
                })
                .OrderBy(d => d.Name)
                .ToListAsync();

            // Upcoming/in-progress events (not cancelled, not soft-deleted)
            var events = await db.Events
                .Where(e => e.ClubId == clubId
                         && !e.IsDeleted
                         && e.Status != EventStatus.Cancelled
                         && e.Status != EventStatus.Completed
                         && (e.StartTime == null || e.StartTime >= now.AddDays(-1)))
                .OrderBy(e => e.StartTime)
                .Take(6)
                .Select(e => new EventPublicDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Description = e.Description,
                    Location = e.Location,
                    StartTime = e.StartTime,
                    EndTime = e.EndTime,
                    Status = e.Status.ToString(),
                })
                .ToListAsync();

            // Recent published posts
            var posts = await db.Posts
                .Where(p => p.ClubId == clubId && p.Status == PostStatus.Published)
                .OrderByDescending(p => p.CreatedAt)
                .Take(9)
                .Select(p => new PostPublicDto
                {
                    Id = p.Id,
                    Title = p.Title,
                    Content = p.Content,
                    ThumbnailUrl = p.ThumbnailUrl,
                    Category = p.Category.ToString(),
                    CreatedAt = p.CreatedAt,
                    AuthorName = p.Author.FullName,
                })
                .ToListAsync();

            // Gallery — only published items visible on public landing page
            var gallery = await db.MediaGalleries
                .Where(g => g.ClubId == clubId && g.Status == MediaStatus.Published)
                .OrderByDescending(g => g.Id)
                .Take(20)
                .Select(g => new MediaItemDto
                {
                    Id = g.Id,
                    MediaUrl = g.MediaUrl,
                    MediaType = g.MediaType.ToString(),
                    Description = g.Description,
                })
                .ToListAsync();

            // Stats — sequential (EF Core DbContext is not thread-safe)
            var memberCount = await db.ClubMemberships.CountAsync(m =>
                m.ClubId == clubId &&
                (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation));
            var eventCount = await db.Events.CountAsync(e => e.ClubId == clubId && !e.IsDeleted);
            var postCount = await db.Posts.CountAsync(p => p.ClubId == clubId && p.Status == PostStatus.Published);
            var deptCount = await db.Departments.CountAsync(d => d.ClubId == clubId && !d.IsDeleted);

            return new ClubLandingDataDto
            {
                Club = new ClubPublicInfoDto
                {
                    Id = club.Id,
                    Name = club.Name,
                    Code = club.Code,
                    Description = club.Description,
                    LogoUrl = club.LogoUrl,
                    CategoryName = club.Category?.Name,
                    AdvisorName = club.AdvisorName,
                    EstablishedDate = club.EstablishedDate?.ToString("yyyy-MM-dd"),
                    MemberCount = memberCount,
                    ContactInfo = club.ContactInfo,
                },
                LandingPage = BuildLandingPageContent(club.LandingPage),
                Departments = departments,
                UpcomingEvents = events,
                RecentPosts = posts,
                Gallery = gallery,
                Stats = new LandingStatsDto
                {
                    MemberCount = memberCount,
                    EventCount = eventCount,
                    PostCount = postCount,
                    DepartmentCount = deptCount,
                },
            };
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private static LandingPageContentDto BuildLandingPageContent(
            UniClub_Hub.Shared.Models.LandingPage? lp)
        {
            if (lp == null) return new LandingPageContentDto();

            Dictionary<string, string>? socialLinks = null;
            if (!string.IsNullOrEmpty(lp.SocialLinks))
            {
                try
                {
                    socialLinks = JsonSerializer.Deserialize<Dictionary<string, string>>(lp.SocialLinks);
                }
                catch { /* ignore malformed JSON */ }
            }

            JsonElement? layoutSettings = null;
            if (!string.IsNullOrEmpty(lp.LayoutSettings))
            {
                try
                {
                    layoutSettings = JsonSerializer.Deserialize<JsonElement>(lp.LayoutSettings);
                }
                catch { /* ignore malformed JSON */ }
            }

            return new LandingPageContentDto
            {
                HeroImage = lp.HeroImage,
                Introduction = lp.Introduction,
                Mission = lp.Mission,
                Vision = lp.Vision,
                SocialLinks = socialLinks,
                LayoutSettings = layoutSettings,
            };
        }

        private static string? ExtractPrimaryColor(string? layoutSettingsJson)
        {
            if (string.IsNullOrEmpty(layoutSettingsJson)) return null;
            try
            {
                var el = JsonSerializer.Deserialize<JsonElement>(layoutSettingsJson);
                if (el.TryGetProperty("theme", out var theme) &&
                    theme.TryGetProperty("primaryColor", out var color))
                {
                    return color.GetString();
                }
            }
            catch { /* ignore */ }
            return null;
        }
    }
}
