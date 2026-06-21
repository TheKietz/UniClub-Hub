using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using UniClub_Hub.Shared.Email;

namespace UniClub_Hub.Tests.Infrastructure;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly PostgresFixture _fx;

    public ApiFactory(PostgresFixture fx) => _fx = fx;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", _fx.ConnectionString);
        builder.UseSetting("Jwt:Key", "integration-test-jwt-key-at-least-32-chars");
        builder.UseSetting("Jwt:AccessTokenExpiryMinutes", "60");
        builder.UseSetting("Jwt:RefreshTokenExpiryDays", "7");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = _fx.ConnectionString,
                ["Jwt:Key"] = "integration-test-jwt-key-at-least-32-chars",
                ["Jwt:AccessTokenExpiryMinutes"] = "60",
                ["Jwt:RefreshTokenExpiryDays"] = "7",
                ["Cloudinary:CloudName"] = "demo",
                ["Cloudinary:ApiKey"] = "123456789012345",
                ["Cloudinary:ApiSecret"] = "abcdefghijklmnopqrstuvwxyz",
                ["AppUrl"] = "https://localhost:54610",
                ["Gemini:ApiKey"] = "test",
                ["Gemini:Model"] = "test",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailService>();
            services.AddSingleton<IEmailService, FakeEmailService>();
        });
    }
}

internal sealed class FakeEmailService : IEmailService
{
    public Task SendAsync(string to, string subject, string htmlBody) => Task.CompletedTask;
}
