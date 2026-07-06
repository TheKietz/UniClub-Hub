using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using UniClub_Hub.Membership.DTOs.User;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

[Collection("Postgres")]
public class UserServiceSecurityTests : DbTestBase
{
    private readonly ApiFactory _factory;

    public UserServiceSecurityTests(PostgresFixture fx) : base(fx)
    {
        _factory = new ApiFactory(fx);
    }

    [Fact]
    public async Task ChangeRoleAsync_WhenLastSuperAdmin_ThrowsInvalidOperation()
    {
        await EnsureRolesAsync();

        await using var scope = _factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var db = Fx.CreateDbContext();

        var admin = new ApplicationUser
        {
            UserName = "only.admin@uef.edu.vn",
            Email = "only.admin@uef.edu.vn",
            EmailConfirmed = true,
            FullName = "Only Admin",
        };
        var create = await userManager.CreateAsync(admin, "Admin@123");
        Assert.True(create.Succeeded);
        await userManager.AddToRoleAsync(admin, "SUPER_ADMIN");

        var svc = new UserService(userManager, db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.ChangeRoleAsync(admin.Id, "USER"));

        Assert.Contains("LAST_SUPER_ADMIN", ex.Message);
    }

    [Fact]
    public async Task UpdateMeAsync_WhenStudentIdAlreadySet_ThrowsInvalidOperation()
    {
        await using var db = Fx.CreateDbContext();
        await using var scope = _factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var user = new ApplicationUser
        {
            UserName = "student.change@uef.edu.vn",
            Email = "student.change@uef.edu.vn",
            EmailConfirmed = true,
            StudentId = "SV001",
        };
        var create = await userManager.CreateAsync(user, "User@123");
        Assert.True(create.Succeeded);

        var svc = new UserService(userManager, db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.UpdateMeAsync(user.Id, new UpdateProfileDto { StudentId = "SV002" }));

        Assert.Contains("Mã sinh viên chỉ có thể đặt một lần", ex.Message);
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
}
