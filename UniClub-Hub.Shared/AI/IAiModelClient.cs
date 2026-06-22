namespace UniClub_Hub.Shared.AI
{
    public interface IAiModelClient
    {
        bool IsConfigured { get; }

        Task<string> GenerateJsonAsync(
            string systemPrompt,
            string userPrompt,
            CancellationToken cancellationToken = default
        );
    }
}
