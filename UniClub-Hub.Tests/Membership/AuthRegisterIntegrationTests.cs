using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Auth;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

[Collection("Postgres")]
public class AuthRegisterIntegrationTests : DbTestBase
{
    private readonly HttpClient _client;

    public AuthRegisterIntegrationTests(PostgresFixture fx) : base(fx)
    {
        var factory = new ApiFactory(fx);
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
        });
    }

    [Fact]
    public async Task Register_WithDisallowedDomain_ReturnsBadRequest()
    {
        await SeedSettingAsync("auth.allowed_domains", "uef.edu.vn");

        var response = await PostRegisterAsync(new RegisterDto
        {
            Email = "x@gmail.com",
            Password = "123456",
            FullName = "Test User",
            StudentId = "SV001",
            Major = "CNTT",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body);
        Assert.False(body!.Success);
        Assert.Contains("Email phải thuộc domain", body.Message);
    }

    [Fact]
    public async Task Register_WithAllowedDomain_ReturnsSuccess()
    {
        await SeedSettingAsync("auth.allowed_domains", "uef.edu.vn");

        var response = await PostRegisterAsync(new RegisterDto
        {
            Email = "new.user@uef.edu.vn",
            Password = "123456",
            FullName = "New User",
            StudentId = "SV002",
            Major = "CNTT",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body);
        Assert.True(body!.Success);

        await using var db = Fx.CreateDbContext();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == "new.user@uef.edu.vn");
        Assert.NotNull(user);
    }

    [Fact]
    public async Task Register_WhenRegistrationClosed_ReturnsBadRequest()
    {
        await SeedSettingAsync("auth.registration_open", "false");

        var response = await PostRegisterAsync(new RegisterDto
        {
            Email = "closed@uef.edu.vn",
            Password = "123456",
            FullName = "Closed User",
            StudentId = "SV003",
            Major = "CNTT",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body);
        Assert.False(body!.Success);
        Assert.Contains("tạm ngừng nhận đăng ký mới", body.Message);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsBadRequest()
    {
        var dto = new RegisterDto
        {
            Email = "dup@uef.edu.vn",
            Password = "123456",
            FullName = "Dup User",
            StudentId = "SV004",
            Major = "CNTT",
        };

        var first = await PostRegisterAsync(dto);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        dto.StudentId = "SV005";
        var second = await PostRegisterAsync(dto);

        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        var body = await second.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body);
        Assert.False(body!.Success);
        Assert.Contains("Email đã được sử dụng", body.Message);
    }

    [Fact]
    public async Task Register_WithEmptyAllowedDomains_AllowsAnyDomain()
    {
        var response = await PostRegisterAsync(new RegisterDto
        {
            Email = "anyone@gmail.com",
            Password = "123456",
            FullName = "Any Domain",
            StudentId = "SV006",
            Major = "CNTT",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
        Assert.NotNull(body);
        Assert.True(body!.Success);
    }

    private Task<HttpResponseMessage> PostRegisterAsync(RegisterDto dto) =>
        _client.PostAsJsonAsync("/api/auth/register", dto);

    private async Task SeedSettingAsync(string key, string value)
    {
        await using var db = Fx.CreateDbContext();
        db.SystemSettings.Add(new SystemSetting
        {
            Key = key,
            Value = value,
            Label = key,
            Category = "auth",
            InputType = "text",
        });
        await db.SaveChangesAsync();
    }
}
