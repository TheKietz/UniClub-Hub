using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Auth;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

[Collection("Postgres")]
public class AuthLoginIntegrationTests : DbTestBase
{
    private readonly HttpClient _client;

    public AuthLoginIntegrationTests(PostgresFixture fx) : base(fx)
    {
        var factory = new ApiFactory(fx);
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
        });
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsSuccess()
    {
        const string email = "login.ok@uef.edu.vn";
        const string password = "123456";

        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = password,
            FullName = "Login User",
            StudentId = "SV100",
            Major = "CNTT",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);

        await ConfirmEmailAsync(email);

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<AuthResponseDto>>();
        Assert.NotNull(body);
        Assert.True(body!.Success);
        Assert.NotNull(body.Data?.AccessToken);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        const string email = "login.bad@uef.edu.vn";

        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = "123456",
            FullName = "Bad Login",
            StudentId = "SV101",
            Major = "CNTT",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        await ConfirmEmailAsync(email);

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = "wrong-password",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body);
        Assert.False(body!.Success);
    }

    [Fact]
    public async Task Login_WhenEmailNotConfirmed_ReturnsUnauthorized()
    {
        const string email = "login.unconfirmed@uef.edu.vn";

        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = "123456",
            FullName = "Unconfirmed",
            StudentId = "SV102",
            Major = "CNTT",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = "123456",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body);
        Assert.Contains("EMAIL_NOT_CONFIRMED", body!.Message);
    }

    private async Task ConfirmEmailAsync(string email)
    {
        await using var db = Fx.CreateDbContext();
        var user = await db.Users.FirstAsync(u => u.Email == email);
        user.EmailConfirmed = true;
        await db.SaveChangesAsync();
    }
}
