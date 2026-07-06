using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class SupportServicePagedTests : DbTestBase
{
    public SupportServicePagedTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task GetAllAsync_WithSearchAndStatus_ReturnsExpectedTickets()
    {
        await using var db = Fx.CreateDbContext();
        db.Users.AddRange(
            PagedServiceTestHelpers.User(1, "Alpha User", "alpha@uef.edu.vn", "S001"),
            PagedServiceTestHelpers.User(2, "Beta User", "beta@uef.edu.vn", "S002"),
            PagedServiceTestHelpers.User(3, "Gamma User", "gamma@uef.edu.vn", "AN003"));
        db.SupportTickets.AddRange(
            PagedServiceTestHelpers.Ticket(1, "u1", "Login issue"),
            PagedServiceTestHelpers.Ticket(2, "u2", "Password reset", status: "Resolved"),
            PagedServiceTestHelpers.Ticket(3, "u3", "Account locked"));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateSupportService(db);

        var search = await service.GetAllAsync(new SupportListQuery { Search = "AN003", Page = 1, PageSize = 20 });
        var open = await service.GetAllAsync(new SupportListQuery { Status = "Open", Page = 1, PageSize = 20 });

        Assert.Single(search.Items);
        Assert.Equal("u3", search.Items[0].UserId);
        Assert.Equal(2, open.TotalCount);
    }

    [Fact]
    public async Task GetAllAsync_WithSortAndPagination_ReturnsExpectedTickets()
    {
        await using var db = Fx.CreateDbContext();
        db.Users.AddRange(
            PagedServiceTestHelpers.User(1, "User One", "one@uef.edu.vn", "S001"),
            PagedServiceTestHelpers.User(2, "User Two", "two@uef.edu.vn", "S002"));
        db.SupportTickets.AddRange(
            PagedServiceTestHelpers.Ticket(1, "u1", "Older ticket", createdAt: new DateTime(2026, 3, 1, 9, 0, 0, DateTimeKind.Utc)),
            PagedServiceTestHelpers.Ticket(2, "u2", "Newer ticket", createdAt: new DateTime(2026, 3, 3, 9, 0, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateSupportService(db);

        var newest = await service.GetAllAsync(new SupportListQuery { SortBy = "createdAt", SortDir = "desc", Page = 1, PageSize = 20 });
        var page1 = await service.GetAllAsync(new SupportListQuery { Page = 1, PageSize = 1 });

        Assert.Equal(new[] { "u2", "u1" }, newest.Items.Select(t => t.UserId).ToArray());
        Assert.Equal(2, page1.TotalCount);
        Assert.Single(page1.Items);
    }
}
