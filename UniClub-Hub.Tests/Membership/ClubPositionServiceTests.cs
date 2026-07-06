using Moq;
using UniClub_Hub.Membership.DTOs.Position;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ClubPositionServiceTests : DbTestBase
{
    public ClubPositionServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task GetMemberPositionsAsync_MemberViewsOwnPositions_WithoutOrgPermissions()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithMember(db);
        db.ClubPositions.Add(new ClubPosition
        {
            Id = 1,
            ClubId = 1,
            DepartmentId = 1,
            Name = "Reviewer",
        });
        db.ClubPositionPermissions.Add(new ClubPositionPermission
        {
            PositionId = 1,
            PermissionCode = ClubPermissions.ApplicationsView,
        });
        db.ClubMemberPositions.Add(new ClubMemberPosition { MembershipId = 1, PositionId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.GetMemberPositionsAsync(1, 1, "u1", isSuperAdmin: false);

        Assert.Single(result.Positions);
    }

    [Fact]
    public async Task GetMemberPositionsAsync_DeptLeadViewsSameDepartment_WithoutOrgPermissions()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithMember(db);
        db.Users.Add(PagedServiceTestHelpers.User(2, "Dept Lead"));
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 2,
            UserId = "u2",
            ClubId = 1,
            DepartmentId = 1,
            ClubRole = ClubRole.DEPT_LEAD,
            Status = MembershipStatus.Active,
            JoinedDate = new DateOnly(2026, 1, 2),
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.GetMemberPositionsAsync(1, 1, "u2", isSuperAdmin: false);

        Assert.Equal(1, result.MembershipId);
    }

    [Fact]
    public async Task GetMemberPositionsAsync_ReturnsPermissionCodesFromPosition()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithMember(db);
        db.ClubPositions.Add(new ClubPosition
        {
            Id = 1,
            ClubId = 1,
            DepartmentId = 1,
            Name = "Reviewer",
        });
        db.ClubPositionPermissions.Add(new ClubPositionPermission
        {
            PositionId = 1,
            PermissionCode = ClubPermissions.ApplicationsView,
        });
        db.ClubMemberPositions.Add(new ClubMemberPosition { MembershipId = 1, PositionId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.GetMemberPositionsAsync(1, 1, "admin", isSuperAdmin: true);

        Assert.Single(result.Positions);
        Assert.Equal("Ban Su kien", result.Positions[0].DepartmentName);
        Assert.Contains(ClubPermissions.ApplicationsView, result.Positions[0].PermissionCodes);
    }

    [Fact]
    public async Task AssignMemberPositionsAsync_WithPositionAssignmentsManage_AllowsFullAssign()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithMember(db);
        db.Users.Add(PagedServiceTestHelpers.User(2, "Assigner"));
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 2,
            UserId = "u2",
            ClubId = 1,
            DepartmentId = 1,
            ClubRole = ClubRole.MEMBER,
            Status = MembershipStatus.Active,
            JoinedDate = new DateOnly(2026, 1, 2),
        });
        db.ClubPositions.Add(new ClubPosition
        {
            Id = 1,
            ClubId = 1,
            DepartmentId = 1,
            Name = "Coordinator",
            CanBeAssignedByDeptLead = false,
        });
        db.ClubPositionPermissions.Add(new ClubPositionPermission
        {
            PositionId = 1,
            PermissionCode = ClubPermissions.ApplicationsView,
        });
        db.ClubPositions.Add(new ClubPosition
        {
            Id = 2,
            ClubId = 1,
            DepartmentId = 1,
            Name = "HR Assigner",
            CanBeAssignedByDeptLead = false,
        });
        db.ClubPositionPermissions.Add(new ClubPositionPermission
        {
            PositionId = 2,
            PermissionCode = ClubPermissions.PositionAssignmentsManage,
        });
        db.ClubMemberPositions.Add(new ClubMemberPosition
        {
            MembershipId = 2,
            PositionId = 2,
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.AssignMemberPositionsAsync(
            1,
            1,
            new AssignMemberPositionsDto { PositionIds = [1] },
            "u2",
            isSuperAdmin: false);

        Assert.Single(result.Positions);
        Assert.Equal(1, result.Positions[0].Id);
    }

    private static ClubPositionService CreateService(Shared.Data.UniClubDbContext db) =>
        new(db, new ClubPermissionService(db));

    private static void SeedClubWithMember(Shared.Data.UniClubDbContext db)
    {
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Su kien"));
        db.Users.Add(PagedServiceTestHelpers.User(1, "Member One"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u1", departmentId: 1));
    }
}
