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
public class AuthSecurityIntegrationTests : DbTestBase
{
    private readonly HttpClient _client;

    public AuthSecurityIntegrationTests(PostgresFixture fx) : base(fx)
    {
        var factory = new ApiFactory(fx);
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
            HandleCookies = true,
        });
    }

    [Fact]
    public async Task Register_DoesNotCreateRefreshToken()
    {
        const string email = "register.no-token@uef.edu.vn";

        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = "123456",
            FullName = "No Token",
            StudentId = "SV200",
            Major = "CNTT",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var db = Fx.CreateDbContext();
        var userId = await db.Users
            .Where(u => u.Email == email)
            .Select(u => u.Id)
            .FirstAsync();
        var tokenCount = await db.RefreshTokens.CountAsync(t => t.UserId == userId);
        Assert.Equal(0, tokenCount);
    }

    [Fact]
    public async Task ResetPassword_WithInvalidToken_ReturnsBadRequest()
    {
        const string email = "reset.bad@uef.edu.vn";

        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = "123456",
            FullName = "Reset Bad",
            StudentId = "SV201",
            Major = "CNTT",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);

        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordDto
        {
            Email = email,
            Token = "not-valid-base64url!!!",
            NewPassword = "654321",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body);
        Assert.False(body!.Success);
    }

    [Fact]
    public async Task Refresh_WhenUserSoftDeleted_ReturnsUnauthorized()
    {
        const string email = "refresh.deleted@uef.edu.vn";
        const string password = "123456";

        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = password,
            FullName = "Deleted User",
            StudentId = "SV202",
            Major = "CNTT",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        await ConfirmEmailAsync(email);

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password,
            RememberMe = false,
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        await using (var db = Fx.CreateDbContext())
        {
            var user = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Email == email);
            user.IsDeleted = true;
            await db.SaveChangesAsync();
        }

        var refresh = await _client.PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
        var body = await refresh.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body);
        Assert.False(body!.Success);
    }

    private async Task ConfirmEmailAsync(string email)
    {
        await using var db = Fx.CreateDbContext();
        var user = await db.Users.FirstAsync(u => u.Email == email);
        user.EmailConfirmed = true;
        await db.SaveChangesAsync();
    }
}
