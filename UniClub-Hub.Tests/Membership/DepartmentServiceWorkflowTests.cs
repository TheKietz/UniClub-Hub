using Microsoft.EntityFrameworkCore;
using Moq;
using UniClub_Hub.Membership.DTOs.Department;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class DepartmentServiceWorkflowTests : DbTestBase
{
    public DepartmentServiceWorkflowTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task UpdateAsync_AsSuperAdmin_UpdatesDepartment()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithDepartment(db);
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.UpdateAsync(
            1, 1,
            new UpdateDepartmentDto { Name = "Ban Truyen thong", Description = "Media team" },
            "admin",
            isSuperAdmin: true);

        Assert.Equal("Ban Truyen thong", result.Name);
        Assert.Equal("Media team", db.Departments.Find(1)!.Description);
    }

    [Fact]
    public async Task DeleteAsync_AsSuperAdmin_RemovesDepartmentAndDemotesLead()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithDepartment(db);
        db.Users.Add(PagedServiceTestHelpers.User(2, "Dept Lead", "lead@uef.edu.vn", "S002"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            2, "u2", role: ClubRole.DEPT_LEAD, departmentId: 1));
        await db.SaveChangesAsync();

        var service = CreateService(db);

        await service.DeleteAsync(1, 1, "admin", isSuperAdmin: true);

        Assert.False(await db.Departments.AnyAsync(d => d.Id == 1));
        var membership = await db.ClubMemberships.FindAsync(2);
        Assert.Null(membership!.DepartmentId);
        Assert.Equal(ClubRole.MEMBER, membership.ClubRole);
    }

    [Fact]
    public async Task SetLeadAsync_WhenResignedDeptLeadRowExists_DoesNotCorruptHistory()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithDepartment(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "New Lead"));
        db.Users.Add(PagedServiceTestHelpers.User(2, "Old Lead"));
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1,
            UserId = "u1",
            ClubId = 1,
            DepartmentId = 1,
            ClubRole = ClubRole.MEMBER,
            Status = MembershipStatus.Active,
            JoinedDate = new DateOnly(2026, 1, 1),
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 2,
            UserId = "u2",
            ClubId = 1,
            DepartmentId = 1,
            ClubRole = ClubRole.DEPT_LEAD,
            Status = MembershipStatus.Resigned,
            JoinedDate = new DateOnly(2025, 1, 1),
            ResignedDate = new DateOnly(2025, 6, 1),
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        await service.SetLeadAsync(1, 1, 1, "admin", isSuperAdmin: true);

        var resignedRow = db.ClubMemberships.Find(2)!;
        var newLead = db.ClubMemberships.Find(1)!;
        Assert.Equal(MembershipStatus.Resigned, resignedRow.Status);
        Assert.Equal(ClubRole.DEPT_LEAD, resignedRow.ClubRole);
        Assert.Equal(ClubRole.DEPT_LEAD, newLead.ClubRole);
        Assert.Equal(MembershipStatus.Active, newLead.Status);
    }

    [Fact]
    public async Task DeleteAsync_RemovesPositionAssignmentsForDepartment()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithDepartment(db);
        db.Users.Add(PagedServiceTestHelpers.User(1));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u1", departmentId: 1));
        db.ClubPositions.Add(new ClubPosition { Id = 1, ClubId = 1, DepartmentId = 1, Name = "Reviewer" });
        db.ClubPositionPermissions.Add(new ClubPositionPermission
        {
            PositionId = 1,
            PermissionCode = ClubPermissions.ApplicationsView,
        });
        db.ClubMemberPositions.Add(new ClubMemberPosition { MembershipId = 1, PositionId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        await service.DeleteAsync(1, 1, "admin", isSuperAdmin: true);

        var permissions = new ClubPermissionService(db);
        var effective = await permissions.GetEffectivePermissionsAsync(1, "u1", isSuperAdmin: false);
        Assert.Empty(effective.PermissionCodes);
        Assert.False(await db.ClubMemberPositions.IgnoreQueryFilters().AnyAsync());
    }

    private static DepartmentService CreateService(UniClub_Hub.Shared.Data.UniClubDbContext db)
    {
        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync(It.IsAny<string>())).ReturnsAsync((string?)null);
        settings.Setup(s => s.GetNotificationTextAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync((string?)null);

        var dispatch = new Mock<INotificationDispatchService>();
        dispatch.Setup(d => d.FireAsync(
            It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, string>>()))
            .Returns(Task.CompletedTask);

        var permissions = new ClubPermissionService(db);
        var membershipService = new ClubMembershipService(
            db, dispatch.Object, settings.Object, permissions);

        return new DepartmentService(
            db,
            Mock.Of<INotificationService>(),
            settings.Object,
            permissions,
            membershipService);
    }

    private static void SeedClubWithDepartment(UniClub_Hub.Shared.Data.UniClubDbContext db)
    {
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Su kien"));
    }
}
