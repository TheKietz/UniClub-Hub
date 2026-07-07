using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using UniClub_Hub.Membership.DTOs.Recommendation;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class RecommendationService(
        UniClubDbContext db,
        IConfiguration config,
        IHttpClientFactory httpClientFactory
    ) : IRecommendationService
    {

        public async Task<IEnumerable<ClubRecommendationResponse>> GetRecommendationsAsync(string? userId, int topN = 3)
        {
            // Load all active clubs with category + member count
            var clubs = await db.Clubs
                .Where(c => c.Status == ClubStatus.Active)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.LogoUrl,
                    c.Description,
                    CategoryName = c.Category != null ? c.Category.Name : null,
                    MemberCount = c.ClubMemberships!
                        .Count(m => m.Status == MembershipStatus.Active),
                })
                .ToListAsync();

            if (clubs.Count == 0) return [];

            // Get clubs user already joined (exclude from results)
            var joinedClubIds = new HashSet<int>();
            string? userMajor = null;
            var joinedCategoryNames = new List<string>();

            if (userId != null)
            {
                var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
                userMajor = user?.Major;

                var memberships = await db.ClubMemberships
                    .Where(m => m.UserId == userId && m.Status == MembershipStatus.Active)
                    .Include(m => m.Club).ThenInclude(c => c!.Category)
                    .ToListAsync();

                foreach (var m in memberships)
                {
                    joinedClubIds.Add(m.ClubId);
                    if (m.Club?.Category?.Name != null)
                        joinedCategoryNames.Add(m.Club.Category.Name);
                }
            }

            var candidates = clubs.Where(c => !joinedClubIds.Contains(c.Id)).ToList();
            if (candidates.Count == 0) candidates = clubs.ToList();

            // Build user profile text
            var profileParts = new List<string>();
            if (!string.IsNullOrEmpty(userMajor)) profileParts.Add(userMajor);
            if (joinedCategoryNames.Count > 0) profileParts.AddRange(joinedCategoryNames);
            var userProfileText = profileParts.Count > 0
                ? string.Join(" ", profileParts)
                : "sinh viên đại học câu lạc bộ hoạt động ngoại khóa";

            // Build club texts
            var clubTexts = candidates
                .Select(c => $"{c.Name} {c.CategoryName ?? ""} {c.Description ?? ""}")
                .ToList();

            // Get embeddings (user profile + all club texts in one call)
            var allTexts = new List<string> { userProfileText };
            allTexts.AddRange(clubTexts);

            double[][]? embeddings;
            try
            {
                embeddings = await GetEmbeddingsAsync(allTexts);
            }
            catch
            {
                // Fallback to popularity-based ranking if HF API fails
                return candidates
                    .OrderByDescending(c => c.MemberCount)
                    .Take(topN)
                    .Select(c => new ClubRecommendationResponse
                    {
                        ClubId = c.Id,
                        Name = c.Name,
                        LogoUrl = c.LogoUrl,
                        Description = c.Description,
                        CategoryName = c.CategoryName,
                        MemberCount = c.MemberCount,
                        SimilarityScore = 0,
                        Reason = "CLB phổ biến nhất hiện tại",
                    });
            }

            if (embeddings == null || embeddings.Length < 2)
                return [];

            var userEmbedding = embeddings[0];

            // Compute cosine similarity for each club
            var scored = candidates
                .Select((c, i) => new
                {
                    Club = c,
                    Score = CosineSimilarity(userEmbedding, embeddings[i + 1]),
                })
                .OrderByDescending(x => x.Score)
                .Take(topN)
                .ToList();

            return scored.Select(x => new ClubRecommendationResponse
            {
                ClubId = x.Club.Id,
                Name = x.Club.Name,
                LogoUrl = x.Club.LogoUrl,
                Description = x.Club.Description,
                CategoryName = x.Club.CategoryName,
                MemberCount = x.Club.MemberCount,
                SimilarityScore = Math.Round(x.Score * 100, 1),
                Reason = BuildReason(x.Club.CategoryName, userMajor, x.Score),
            });
        }

        private async Task<double[][]?> GetEmbeddingsAsync(List<string> texts)
        {
            var model = config["HuggingFace:Model"] ?? "sentence-transformers/all-MiniLM-L6-v2";
            var token = config["HuggingFace:ApiToken"]!;
            var url = $"https://api-inference.huggingface.co/models/{model}";

            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var body = JsonSerializer.Serialize(new { inputs = texts });
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(url, content);
            var json = await response.Content.ReadAsStringAsync();

            return JsonSerializer.Deserialize<double[][]>(json);
        }

        private static double CosineSimilarity(double[] a, double[] b)
        {
            double dot = 0, normA = 0, normB = 0;
            for (int i = 0; i < Math.Min(a.Length, b.Length); i++)
            {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return normA == 0 || normB == 0 ? 0 : dot / (Math.Sqrt(normA) * Math.Sqrt(normB));
        }

        private static string BuildReason(string? category, string? major, double score)
        {
            if (score > 0.7) return $"Rất phù hợp với hồ sơ của bạn";
            if (!string.IsNullOrEmpty(category) && !string.IsNullOrEmpty(major))
                return $"Phù hợp với ngành {major}";
            if (!string.IsNullOrEmpty(category))
                return $"Lĩnh vực {category} phổ biến với sinh viên";
            return "Được nhiều sinh viên quan tâm";
        }
    }
}
