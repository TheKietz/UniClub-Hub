using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace UniClub_Hub.Shared.AI
{
    public class GeminiAiModelClient : IAiModelClient
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        private readonly HttpClient _httpClient;
        private readonly GeminiOptions _options;
        private readonly ILogger<GeminiAiModelClient> _logger;

        public GeminiAiModelClient(
            HttpClient httpClient,
            IOptions<GeminiOptions> options,
            ILogger<GeminiAiModelClient> logger
        )
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;
        }

        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(_options.ApiKey)
            && !string.IsNullOrWhiteSpace(_options.Model);

        public async Task<string> GenerateJsonAsync(
            string systemPrompt,
            string userPrompt,
            CancellationToken cancellationToken = default
        )
        {
            if (!IsConfigured)
                throw new InvalidOperationException("AI model is not configured.");

            var baseUrl = _options.BaseUrl.TrimEnd('/');
            var model = Uri.EscapeDataString(_options.Model);
            var requestUri = $"{baseUrl}/v1beta/models/{model}:generateContent";

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUri);
            httpRequest.Headers.Add("x-goog-api-key", _options.ApiKey);

            var request = new GeminiGenerateContentRequest(
                [
                    new GeminiContent(
                        "user",
                        [
                            new GeminiPart(
                                $"{systemPrompt}\n\n{userPrompt}\n\nChỉ trả về JSON hợp lệ, không markdown."
                            ),
                        ]
                    ),
                ],
                new GeminiGenerationConfig(_options.Temperature, "application/json")
            );

            httpRequest.Content = JsonContent.Create(request, options: JsonOptions);

            using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);

            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Gemini request failed with status {StatusCode}: {Response}",
                    response.StatusCode,
                    responseText
                );
                throw new InvalidOperationException("AI model request failed.");
            }

            var payload = JsonSerializer.Deserialize<GeminiGenerateContentResponse>(
                responseText,
                JsonOptions
            );

            var text = payload
                ?.Candidates
                ?.FirstOrDefault()
                ?.Content
                ?.Parts
                ?.FirstOrDefault(p => !string.IsNullOrWhiteSpace(p.Text))
                ?.Text;

            if (string.IsNullOrWhiteSpace(text))
                throw new InvalidOperationException("AI model returned an empty response.");

            return StripJsonFence(text);
        }

        private static string StripJsonFence(string text)
        {
            var trimmed = text.Trim();
            if (!trimmed.StartsWith("```", StringComparison.Ordinal))
                return trimmed;

            var firstNewLine = trimmed.IndexOf('\n');
            var lastFence = trimmed.LastIndexOf("```", StringComparison.Ordinal);
            if (firstNewLine < 0 || lastFence <= firstNewLine)
                return trimmed;

            return trimmed[(firstNewLine + 1)..lastFence].Trim();
        }

        private sealed record GeminiGenerateContentRequest(
            List<GeminiContent> Contents,
            GeminiGenerationConfig GenerationConfig
        );

        private sealed record GeminiContent(string Role, List<GeminiPart> Parts);

        private sealed record GeminiPart(string Text);

        private sealed record GeminiGenerationConfig(double Temperature, string ResponseMimeType);

        private sealed class GeminiGenerateContentResponse
        {
            public List<GeminiCandidate>? Candidates { get; set; }
        }

        private sealed class GeminiCandidate
        {
            public GeminiResponseContent? Content { get; set; }
        }

        private sealed class GeminiResponseContent
        {
            public List<GeminiResponsePart>? Parts { get; set; }
        }

        private sealed class GeminiResponsePart
        {
            public string? Text { get; set; }
        }
    }
}
