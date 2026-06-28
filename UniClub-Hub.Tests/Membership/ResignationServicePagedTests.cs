using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ResignationServicePagedTests : DbTestBase
{
    public ResignationServicePagedTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task GetByClubAsync_WithSearchAndStatus_ReturnsExpectedRequests()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.AddRange(
            PagedServiceTestHelpers.User(1, "Alpha Lead", "alpha@uef.edu.vn", "S001"),
            PagedServiceTestHelpers.User(2, "Beta Lead", "beta@uef.edu.vn", "S002"),
            PagedServiceTestHelpers.User(3, "Gamma Lead", "gamma@uef.edu.vn", "AN003"));
        db.ClubMemberships.AddRange(
            PagedServiceTestHelpers.Membership(1, "u1", role: ClubRole.DEPT_LEAD),
            PagedServiceTestHelpers.Membership(2, "u2", role: ClubRole.DEPT_LEAD),
            PagedServiceTestHelpers.Membership(3, "u3", role: ClubRole.DEPT_LEAD));
        db.ResignationRequests.AddRange(
            PagedServiceTestHelpers.Resignation(1, "u1", 1),
            PagedServiceTestHelpers.Resignation(2, "u2", 2, status: ResignationStatus.Approved),
            PagedServiceTestHelpers.Resignation(3, "u3", 3));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        var search = await service.GetByClubAsync(1, "reviewer", false, new ResignationListQuery { Search = "AN003", Page = 1, PageSize = 20 });
        var pending = await service.GetByClubAsync(1, "reviewer", false, new ResignationListQuery { Status = "Pending", Page = 1, PageSize = 20 });

        Assert.Single(search.Items);
        Assert.Equal("u3", search.Items[0].UserId);
        Assert.Equal(2, pending.TotalCount);
    }

    [Fact]
    public async Task GetAllClubAdminRequestsAsync_WithSortAndPagination_ReturnsExpectedRequests()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.AddRange(
            PagedServiceTestHelpers.User(1, "Admin One", "admin1@uef.edu.vn", "S001"),
            PagedServiceTestHelpers.User(2, "Admin Two", "admin2@uef.edu.vn", "S002"));
        db.ClubMemberships.AddRange(
            PagedServiceTestHelpers.Membership(1, "u1", role: ClubRole.CLUB_ADMIN),
            PagedServiceTestHelpers.Membership(2, "u2", role: ClubRole.CLUB_ADMIN));
        db.ResignationRequests.AddRange(
            PagedServiceTestHelpers.Resignation(1, "u1", 1, requestedAt: new DateTime(2026, 3, 1, 9, 0, 0, DateTimeKind.Utc)),
            PagedServiceTestHelpers.Resignation(2, "u2", 2, requestedAt: new DateTime(2026, 3, 3, 9, 0, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        var newest = await service.GetAllClubAdminRequestsAsync(new ResignationListQuery { SortBy = "requestedAt", SortDir = "desc", Page = 1, PageSize = 20 });
        var page1 = await service.GetAllClubAdminRequestsAsync(new ResignationListQuery { Page = 1, PageSize = 1 });

        Assert.Equal(new[] { "u2", "u1" }, newest.Items.Select(r => r.UserId).ToArray());
        Assert.Equal(2, page1.TotalCount);
        Assert.Single(page1.Items);
    }

    private static void SeedClub(UniClub_Hub.Shared.Data.UniClubDbContext db)
    {
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
    }
}
