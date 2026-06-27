using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ClubServicePagedTests : DbTestBase
{
    public ClubServicePagedTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task GetAllAdminPageAsync_WithSearchAndEmptySearch_ReturnsExpectedClubs()
    {
        await using var db = Fx.CreateDbContext();
        var marketing = PagedServiceTestHelpers.Club(2, "Marketing Club", "MKT");
        marketing.Description = "Brand builders";
        var photo = PagedServiceTestHelpers.Club(3, "Photo Club", "PIC");
        photo.AdvisorName = "An Nguyen";

        db.Clubs.AddRange(
            PagedServiceTestHelpers.Club(1, "IT Society", "ITS"),
            marketing,
            photo);
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubService(db);

        var search = await service.GetAllAdminPageAsync(new AdminClubListQuery { Search = "an", Page = 1, PageSize = 20 });
        var all = await service.GetAllAdminPageAsync(new AdminClubListQuery { Search = "", Page = 1, PageSize = 20 });

        Assert.Equal(2, search.TotalCount);
        Assert.Contains(search.Items, c => c.Code == "MKT");
        Assert.Contains(search.Items, c => c.Code == "PIC");
        Assert.Equal(3, all.TotalCount);
    }

    [Fact]
    public async Task GetAllAdminPageAsync_WithCategoryStatusSortAndDefault_ReturnsExpectedClubs()
    {
        await using var db = Fx.CreateDbContext();
        db.Categories.AddRange(
            new Category { Id = 1, Name = "Academic" },
            new Category { Id = 2, Name = "Sports" });
        db.Clubs.AddRange(
            PagedServiceTestHelpers.Club(1, "Alpha", "A", categoryId: 1),
            PagedServiceTestHelpers.Club(2, "Beta", "B", categoryId: 1, status: ClubStatus.Inactive),
            PagedServiceTestHelpers.Club(3, "Gamma", "G", categoryId: 2));
        db.Users.AddRange(PagedServiceTestHelpers.User(1), PagedServiceTestHelpers.User(2), PagedServiceTestHelpers.User(3));
        db.ClubMemberships.AddRange(
            PagedServiceTestHelpers.Membership(1, "u1", clubId: 1),
            PagedServiceTestHelpers.Membership(2, "u2", clubId: 1),
            PagedServiceTestHelpers.Membership(3, "u3", clubId: 3));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubService(db);

        var activeAcademic = await service.GetAllAdminPageAsync(new AdminClubListQuery { CategoryId = 1, Status = "Active", Page = 1, PageSize = 20 });
        var membersDesc = await service.GetAllAdminPageAsync(new AdminClubListQuery { SortBy = "members", SortDir = "desc", Page = 1, PageSize = 20 });
        var defaultSort = await service.GetAllAdminPageAsync(new AdminClubListQuery { SortBy = "does_not_exist", SortDir = "desc", Page = 1, PageSize = 20 });

        Assert.Single(activeAcademic.Items);
        Assert.Equal("A", activeAcademic.Items[0].Code);
        Assert.Equal(new[] { "A", "G", "B" }, membersDesc.Items.Select(c => c.Code).ToArray());
        Assert.Equal(new[] { 3, 2, 1 }, defaultSort.Items.Select(c => c.Id).ToArray());
    }

    [Fact]
    public async Task GetAllAdminPageAsync_WithDuplicateSortKeyAcrossPages_ReturnsStableNonOverlappingPages()
    {
        await using var db = Fx.CreateDbContext();
        for (var i = 1; i <= 22; i++)
            db.Clubs.Add(PagedServiceTestHelpers.Club(i, "Same Club", $"C{i:00}"));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubService(db);

        var page1 = await service.GetAllAdminPageAsync(new AdminClubListQuery { SortBy = "name", Page = 1, PageSize = 20 });
        var page2 = await service.GetAllAdminPageAsync(new AdminClubListQuery { SortBy = "name", Page = 2, PageSize = 20 });
        var clamped = await service.GetAllAdminPageAsync(new AdminClubListQuery { Page = 0, PageSize = 1000 });
        var fullList = await service.GetAllAdminAsync();

        Assert.Empty(page1.Items.Select(c => c.Id).Intersect(page2.Items.Select(c => c.Id)));
        Assert.Equal(22, page1.Items.Concat(page2.Items).Select(c => c.Id).Distinct().Count());
        Assert.Equal(1, clamped.Page);
        Assert.Equal(100, clamped.PageSize);
        Assert.Equal(22, fullList.Count());
    }
}
