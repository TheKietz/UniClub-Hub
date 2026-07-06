using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UniClub_Hub.Membership.DTOs.Auth;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

[Collection("Postgres")]
public class AuthSecurityIntegrationTests : DbTestBase
{
    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public AuthSecurityIntegrationTests(PostgresFixture fx) : base(fx)
    {
        _factory = new ApiFactory(fx);
        _client = _factory.CreateClient(new WebApplicationFactoryClientOptions
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

    [Fact]
    public async Task AdminImport_ResetPassword_ThenLogin_Succeeds()
    {
        const string importedEmail = "imported.reset@uef.edu.vn";
        const string newPassword = "654321";

        await EnsureRolesAsync();
        var adminToken = await CreateSuperAdminAndLoginAsync();

        using var importClient = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
        });
        importClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var import = await importClient.PostAsJsonAsync("/api/admin/import/users/confirm", new ImportUserConfirmRequest
        {
            Rows =
            [
                new ImportUserRowResult
                {
                    Email = importedEmail,
                    FullName = "Imported User",
                    StudentId = "SV900",
                    Major = "CNTT",
                },
            ],
        });
        Assert.Equal(HttpStatusCode.OK, import.StatusCode);

        await using (var db = Fx.CreateDbContext())
        {
            var imported = await db.Users.FirstAsync(u => u.Email == importedEmail);
            Assert.False(imported.EmailConfirmed);
        }

        var resetToken = await GeneratePasswordResetTokenAsync(importedEmail);
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(resetToken));

        var reset = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordDto
        {
            Email = importedEmail,
            Token = encodedToken,
            NewPassword = newPassword,
        });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        await using (var db = Fx.CreateDbContext())
        {
            var imported = await db.Users.FirstAsync(u => u.Email == importedEmail);
            Assert.True(imported.EmailConfirmed);
        }

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = importedEmail,
            Password = newPassword,
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<ApiResponse<AuthResponseDto>>();
        Assert.NotNull(body);
        Assert.True(body!.Success);
        Assert.NotNull(body.Data?.AccessToken);
    }

    private async Task EnsureRolesAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "SUPER_ADMIN", "USER" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }
    }

    private async Task<string> CreateSuperAdminAndLoginAsync()
    {
        const string email = "superadmin.import-test@uef.edu.vn";
        const string password = "admin123";

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var existing = await userManager.FindByEmailAsync(email);
            if (existing == null)
            {
                var admin = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = "Super Admin",
                    EmailConfirmed = true,
                };
                var create = await userManager.CreateAsync(admin, password);
                Assert.True(create.Succeeded);
                await userManager.AddToRoleAsync(admin, "SUPER_ADMIN");
            }
        }

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password,
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<ApiResponse<AuthResponseDto>>();
        Assert.NotNull(body?.Data?.AccessToken);
        return body!.Data!.AccessToken;
    }

    private async Task<string> GeneratePasswordResetTokenAsync(string email)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync(email);
        Assert.NotNull(user);
        return await userManager.GeneratePasswordResetTokenAsync(user!);
    }

    private async Task ConfirmEmailAsync(string email)
    {
        await using var db = Fx.CreateDbContext();
        var user = await db.Users.FirstAsync(u => u.Email == email);
        user.EmailConfirmed = true;
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Login_WhenUserLocked_ReturnsUnauthorized()
    {
        const string email = "locked.user@uef.edu.vn";
        const string password = "123456";

        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = password,
            FullName = "Locked User",
            StudentId = "SV300",
            Major = "CNTT",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        await ConfirmEmailAsync(email);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await userManager.FindByEmailAsync(email);
            Assert.NotNull(user);
            await userManager.SetLockoutEnabledAsync(user!, true);
            await userManager.SetLockoutEndDateAsync(user!, DateTimeOffset.MaxValue);
        }

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password,
        });

        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task Refresh_WhenUserLocked_ReturnsUnauthorized()
    {
        const string email = "locked.refresh@uef.edu.vn";
        const string password = "123456";

        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = password,
            FullName = "Locked Refresh",
            StudentId = "SV301",
            Major = "CNTT",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        await ConfirmEmailAsync(email);

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password,
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await userManager.FindByEmailAsync(email);
            Assert.NotNull(user);
            await userManager.SetLockoutEnabledAsync(user!, true);
            await userManager.SetLockoutEndDateAsync(user!, DateTimeOffset.MaxValue);
        }

        var refresh = await _client.PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task Login_AfterUnlock_Succeeds()
    {
        const string email = "unlock.user@uef.edu.vn";
        const string password = "123456";

        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = password,
            FullName = "Unlock User",
            StudentId = "SV302",
            Major = "CNTT",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        await ConfirmEmailAsync(email);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await userManager.FindByEmailAsync(email);
            Assert.NotNull(user);
            await userManager.SetLockoutEnabledAsync(user!, true);
            await userManager.SetLockoutEndDateAsync(user!, DateTimeOffset.MaxValue);
            await userManager.SetLockoutEndDateAsync(user!, null);
            await userManager.ResetAccessFailedCountAsync(user!);
        }

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password,
        });

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }
}
