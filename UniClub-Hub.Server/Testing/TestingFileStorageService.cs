using Microsoft.AspNetCore.Http;
using UniClub_Hub.Shared.Common.Storage;

namespace UniClub_Hub.Server.Testing;

internal sealed class TestingFileStorageService : IFileStorageService
{
    public Task<string?> UploadAsync(IFormFile file, string folder) =>
        Task.FromResult<string?>("https://test.local/upload");

    public Task DeleteAsync(string? fileUrl) => Task.CompletedTask;
}
