using Microsoft.AspNetCore.Identity;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class UserServicePagedTests : DbTestBase
{
    public UserServicePagedTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task GetUsersAsync_WithSearchAndEmptySearch_ReturnsExpectedUsers()
    {
        await using var db = Fx.CreateDbContext();
        db.Users.AddRange(
            PagedServiceTestHelpers.User(1, "Nguyen An", "an@uef.edu.vn", "S001"),
            PagedServiceTestHelpers.User(2, "Binh Tran", "binh@uef.edu.vn", "S002"),
            PagedServiceTestHelpers.User(3, "Chi Le", "chi@uef.edu.vn", "AN003"));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateUserService(db);

        var search = await service.GetUsersAsync(new UserListQuery { Search = "AN003", Page = 1, PageSize = 20 });
        var all = await service.GetUsersAsync(new UserListQuery { Search = "", Page = 1, PageSize = 20 });

        Assert.Single(search.Items);
        Assert.Contains(search.Items, u => u.StudentId == "AN003");
        Assert.Equal(3, all.TotalCount);
    }

    [Fact]
    public async Task GetUsersAsync_WithStatusRoleAndSort_ReturnsFilteredAndSortedUsers()
    {
        await using var db = Fx.CreateDbContext();
        var lockedUser = PagedServiceTestHelpers.User(3, "Gamma", "gamma@uef.edu.vn", "S003");
        lockedUser.LockoutEnabled = true;
        lockedUser.LockoutEnd = DateTimeOffset.UtcNow.AddDays(1);

        db.Users.AddRange(
            PagedServiceTestHelpers.User(1, "Alpha", "zeta@uef.edu.vn", "S001"),
            PagedServiceTestHelpers.User(2, "Beta", "beta@uef.edu.vn", "S002"),
            lockedUser);
        db.Roles.AddRange(
            new IdentityRole { Id = "role-user", Name = "USER", NormalizedName = "USER" },
            new IdentityRole { Id = "role-super", Name = "SUPER_ADMIN", NormalizedName = "SUPER_ADMIN" });
        db.UserRoles.AddRange(
            new IdentityUserRole<string> { UserId = "u1", RoleId = "role-super" },
            new IdentityUserRole<string> { UserId = "u2", RoleId = "role-user" });
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateUserService(db);

        var superAdmins = await service.GetUsersAsync(new UserListQuery { Role = "SUPER_ADMIN", Page = 1, PageSize = 20 });
        var locked = await service.GetUsersAsync(new UserListQuery { Status = "locked", Page = 1, PageSize = 20 });
        var emailDesc = await service.GetUsersAsync(new UserListQuery { SortBy = "email", SortDir = "desc", Page = 1, PageSize = 20 });
        var defaultSort = await service.GetUsersAsync(new UserListQuery { SortBy = "not_real", Page = 1, PageSize = 20 });

        Assert.Single(superAdmins.Items);
        Assert.Equal("u1", superAdmins.Items[0].Id);
        Assert.Single(locked.Items);
        Assert.Equal("u3", locked.Items[0].Id);
        Assert.Equal(new[] { "zeta@uef.edu.vn", "gamma@uef.edu.vn", "beta@uef.edu.vn" }, emailDesc.Items.Select(u => u.Email).ToArray());
        Assert.Equal(new[] { "Alpha", "Beta", "Gamma" }, defaultSort.Items.Select(u => u.FullName).ToArray());
    }

    [Fact]
    public async Task GetUsersAsync_WithDuplicateSortKeyAcrossPages_ReturnsStableNonOverlappingPages()
    {
        await using var db = Fx.CreateDbContext();
        for (var i = 1; i <= 22; i++)
            db.Users.Add(PagedServiceTestHelpers.User(i, "Same Name", $"same{i:00}@uef.edu.vn", $"S{i:000}"));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateUserService(db);

        var page1 = await service.GetUsersAsync(new UserListQuery { SortBy = "name", Page = 1, PageSize = 20 });
        var page2 = await service.GetUsersAsync(new UserListQuery { SortBy = "name", Page = 2, PageSize = 20 });
        var clamped = await service.GetUsersAsync(new UserListQuery { SortBy = "name", Page = 0, PageSize = 1000 });

        Assert.Equal(22, page1.TotalCount);
        Assert.Equal(20, page1.Items.Count);
        Assert.Equal(2, page2.Items.Count);
        Assert.Empty(page1.Items.Select(u => u.Id).Intersect(page2.Items.Select(u => u.Id)));
        Assert.Equal(22, page1.Items.Concat(page2.Items).Select(u => u.Id).Distinct().Count());
        Assert.Equal(1, clamped.Page);
        Assert.Equal(100, clamped.PageSize);
    }
}
