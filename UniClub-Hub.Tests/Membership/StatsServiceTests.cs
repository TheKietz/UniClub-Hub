using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class StatsServiceTests : DbTestBase
{
    public StatsServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task GetSystemStatsAsync_WithSeedData_ReturnsCorrectCounts()
    {
        await using var db = Fx.CreateDbContext();
        db.Categories.Add(new Category { Id = 1, Name = "Technology" });
        db.Users.AddRange(
            PagedServiceTestHelpers.User(1),
            PagedServiceTestHelpers.User(2));
        db.Clubs.AddRange(
            PagedServiceTestHelpers.Club(1, "Active Club", "ACT", categoryId: 1),
            PagedServiceTestHelpers.Club(2, "Inactive Club", "INA", categoryId: 1, status: ClubStatus.Inactive));
        db.ClubMemberships.AddRange(
            PagedServiceTestHelpers.Membership(1, "u1", clubId: 1),
            PagedServiceTestHelpers.Membership(2, "u2", clubId: 1),
            PagedServiceTestHelpers.Membership(3, "u1", clubId: 2, status: MembershipStatus.Probation));
        db.Applications.AddRange(
            PagedServiceTestHelpers.Application(1, "u1", clubId: 1, status: ApplicationStatus.Pending),
            PagedServiceTestHelpers.Application(2, "u2", clubId: 1, status: ApplicationStatus.Accepted));
        await db.SaveChangesAsync();

        var service = new StatsService(db);

        var stats = await service.GetSystemStatsAsync();

        Assert.Equal(2, stats.TotalUsers);
        Assert.Equal(2, stats.TotalClubs);
        Assert.Equal(1, stats.ActiveClubs);
        Assert.Equal(2, stats.TotalActiveMembers);
        Assert.Equal(1, stats.TotalProbationMembers);
        Assert.Equal(1, stats.Applications.Pending);
        Assert.Equal(1, stats.Applications.Accepted);
        Assert.Single(stats.ClubsByCategory);
        Assert.Equal("Active Club", stats.TopClubsByMembers[0].ClubName);
        Assert.Equal(2, stats.TopClubsByMembers[0].MemberCount);
    }

    [Fact]
    public async Task GetClubStatsAsync_WithSeedData_ReturnsRoleBreakdown()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Su kien"));
        db.Users.AddRange(PagedServiceTestHelpers.User(1), PagedServiceTestHelpers.User(2));
        db.ClubMemberships.AddRange(
            PagedServiceTestHelpers.Membership(1, "u1", role: ClubRole.CLUB_ADMIN),
            PagedServiceTestHelpers.Membership(2, "u2", role: ClubRole.MEMBER, departmentId: 1));
        db.Applications.Add(PagedServiceTestHelpers.Application(1, "u2", status: ApplicationStatus.Rejected));
        await db.SaveChangesAsync();

        var service = new StatsService(db);

        var stats = await service.GetClubStatsAsync(1);

        Assert.NotNull(stats);
        Assert.Equal(2, stats!.TotalActiveMembers);
        Assert.Equal(1, stats.MembersByRole[ClubRole.CLUB_ADMIN]);
        Assert.Equal(1, stats.MembersByRole[ClubRole.MEMBER]);
        Assert.Equal(2, stats.MembersByDepartment.Count);
        Assert.Contains(stats.MembersByDepartment, d => d.DepartmentName == "Ban Su kien" && d.MemberCount == 1);
        Assert.Contains(stats.MembersByDepartment, d => d.DepartmentName == "Chưa có ban" && d.MemberCount == 1);
        Assert.Equal(1, stats.Applications.Rejected);
        Assert.Equal(1, stats.TotalDepartments);
    }
}
