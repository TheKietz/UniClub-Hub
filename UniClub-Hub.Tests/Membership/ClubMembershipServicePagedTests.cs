using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ClubMembershipServicePagedTests : DbTestBase
{
    public ClubMembershipServicePagedTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task GetPageAsync_WithSearchAndEmptySearch_ReturnsExpectedMembers()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.AddRange(
            PagedServiceTestHelpers.User(1, "Nguyen An", "an@uef.edu.vn", "S001"),
            PagedServiceTestHelpers.User(2, "Binh Tran", "binh@uef.edu.vn", "S002"),
            PagedServiceTestHelpers.User(3, "Chi Le", "chi@uef.edu.vn", "AN003"));
        db.ClubMemberships.AddRange(
            PagedServiceTestHelpers.Membership(1, "u1"),
            PagedServiceTestHelpers.Membership(2, "u2"),
            PagedServiceTestHelpers.Membership(3, "u3"));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubMembershipService(db);

        var search = await service.GetPageAsync(1, new MemberListQuery { Search = "AN003", Page = 1, PageSize = 20 });
        var all = await service.GetPageAsync(1, new MemberListQuery { Search = "", Page = 1, PageSize = 20 });

        Assert.Single(search.Items);
        Assert.Contains(search.Items, m => m.StudentId == "AN003");
        Assert.Equal(3, all.TotalCount);
    }

    [Fact]
    public async Task GetPageAsync_WithRoleStatusDepartmentSortAndDefault_ReturnsExpectedMembers()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Departments.AddRange(
            PagedServiceTestHelpers.Department(1, 1, "Tech"),
            PagedServiceTestHelpers.Department(2, 1, "Media"));
        db.Users.AddRange(
            PagedServiceTestHelpers.User(1, "Alpha", "alpha@uef.edu.vn", "S001"),
            PagedServiceTestHelpers.User(2, "Beta", "beta@uef.edu.vn", "S002"),
            PagedServiceTestHelpers.User(3, "Gamma", "gamma@uef.edu.vn", "S003"));
        db.ClubMemberships.AddRange(
            PagedServiceTestHelpers.Membership(1, "u1", role: ClubRole.CLUB_ADMIN, departmentId: 1),
            PagedServiceTestHelpers.Membership(2, "u2", role: ClubRole.MEMBER, status: MembershipStatus.Probation, departmentId: 1),
            PagedServiceTestHelpers.Membership(3, "u3", role: ClubRole.DEPT_LEAD, departmentId: 2));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubMembershipService(db);

        var probation = await service.GetPageAsync(1, new MemberListQuery { Status = "Probation", Page = 1, PageSize = 20 });
        var tech = await service.GetPageAsync(1, new MemberListQuery { DepartmentId = 1, Page = 1, PageSize = 20 });
        var admins = await service.GetPageAsync(1, new MemberListQuery { Role = "CLUB_ADMIN", Page = 1, PageSize = 20 });
        var roleDesc = await service.GetPageAsync(1, new MemberListQuery { SortBy = "role", SortDir = "desc", Page = 1, PageSize = 20 });
        var defaultSort = await service.GetPageAsync(1, new MemberListQuery { SortBy = "nope", Page = 1, PageSize = 20 });

        Assert.Single(probation.Items);
        Assert.Equal("u2", probation.Items[0].UserId);
        Assert.Equal(new[] { "u1", "u2" }, tech.Items.Select(m => m.UserId).ToArray());
        Assert.Single(admins.Items);
        Assert.Equal("u1", admins.Items[0].UserId);
        Assert.Equal(new[] { "u2", "u3", "u1" }, roleDesc.Items.Select(m => m.UserId).ToArray());
        Assert.Equal(new[] { "Alpha", "Beta", "Gamma" }, defaultSort.Items.Select(m => m.FullName).ToArray());
    }

    [Fact]
    public async Task GetPageAsync_WithNoStatusFilter_ExcludesResignedHistoryRows()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Linh", "linh@uef.edu.vn", "S001"));
        db.ClubMemberships.AddRange(
            PagedServiceTestHelpers.Membership(1, "u1", role: ClubRole.DEPT_LEAD, status: MembershipStatus.Resigned),
            PagedServiceTestHelpers.Membership(2, "u1", role: ClubRole.DEPT_LEAD, status: MembershipStatus.Active),
            PagedServiceTestHelpers.Membership(3, "u1", role: ClubRole.MEMBER, status: MembershipStatus.Resigned));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubMembershipService(db);

        var page = await service.GetPageAsync(1, new MemberListQuery { Page = 1, PageSize = 20 });
        var all = (await service.GetAllAsync(1)).ToList();
        var resignedOnly = await service.GetPageAsync(1, new MemberListQuery { Status = "Resigned", Page = 1, PageSize = 20 });

        Assert.Equal(1, page.TotalCount);
        Assert.Single(page.Items);
        Assert.Equal(2, page.Items[0].Id);
        Assert.Equal(MembershipStatus.Active, page.Items[0].Status);
        Assert.Single(all);
        Assert.Equal(2, resignedOnly.TotalCount);
    }

    [Fact]
    public async Task GetPageAsync_WithDuplicateSortKeyAcrossPages_ReturnsStableNonOverlappingPages()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        for (var i = 1; i <= 22; i++)
        {
            db.Users.Add(PagedServiceTestHelpers.User(i, "Same Member", $"same{i:00}@uef.edu.vn", $"S{i:000}"));
            db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(i, $"u{i}"));
        }
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubMembershipService(db);

        var page1 = await service.GetPageAsync(1, new MemberListQuery { SortBy = "name", Page = 1, PageSize = 20 });
        var page2 = await service.GetPageAsync(1, new MemberListQuery { SortBy = "name", Page = 2, PageSize = 20 });
        var clamped = await service.GetPageAsync(1, new MemberListQuery { Page = 0, PageSize = 1000 });
        var fullList = await service.GetAllAsync(1);

        Assert.Empty(page1.Items.Select(m => m.Id).Intersect(page2.Items.Select(m => m.Id)));
        Assert.Equal(22, page1.Items.Concat(page2.Items).Select(m => m.Id).Distinct().Count());
        Assert.Equal(1, clamped.Page);
        Assert.Equal(100, clamped.PageSize);
        Assert.Equal(22, fullList.Count());
    }

    private static void SeedClub(UniClub_Hub.Shared.Data.UniClubDbContext db)
    {
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
    }
}
