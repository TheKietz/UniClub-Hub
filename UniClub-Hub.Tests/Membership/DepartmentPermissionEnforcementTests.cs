using Moq;
using UniClub_Hub.Membership.DTOs.Department;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class DepartmentPermissionEnforcementTests : DbTestBase
{
    public DepartmentPermissionEnforcementTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task CreateAsync_WithoutDepartmentsManagePermission_ThrowsUnauthorizedAccess()
    {
        await using var db = Fx.CreateDbContext();
        SeedMember(db);
        await db.SaveChangesAsync();

        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.CreateAsync(1, new CreateDepartmentDto { Name = "Ban Su kien" }, "member", isSuperAdmin: false));
    }

    [Fact]
    public async Task CreateAsync_WithDepartmentsManagePermission_CreatesDepartment()
    {
        await using var db = Fx.CreateDbContext();
        SeedMember(db);
        db.ClubPositions.Add(new ClubPosition { Id = 1, ClubId = 1, Name = "Quan ly ban" });
        db.ClubPositionPermissions.Add(new ClubPositionPermission
        {
            PositionId = 1,
            PermissionCode = ClubPermissions.DepartmentsManage
        });
        db.ClubMemberPositions.Add(new ClubMemberPosition { MembershipId = 1, PositionId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.CreateAsync(
            1,
            new CreateDepartmentDto { Name = "Ban Su kien", Description = "Event team" },
            "member",
            isSuperAdmin: false);

        Assert.Equal("Ban Su kien", result.Name);
        Assert.Single(db.Departments);
    }

    private static DepartmentService CreateService(UniClubDbContext db)
    {
        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync("club.max_departments")).ReturnsAsync((string?)null);

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

    private static void SeedMember(UniClubDbContext db)
    {
        db.Clubs.Add(new Club { Id = 1, Name = "Test CLB", Code = "T" });
        db.Users.Add(new ApplicationUser
        {
            Id = "member",
            UserName = "member",
            NormalizedUserName = "MEMBER",
            Email = "member@uef.edu.vn",
            NormalizedEmail = "MEMBER@UEF.EDU.VN",
            SecurityStamp = Guid.NewGuid().ToString()
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1,
            UserId = "member",
            ClubId = 1,
            Status = MembershipStatus.Active,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ClubRole = ClubRole.MEMBER
        });
    }
}
