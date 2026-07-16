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

    [Fact]
    public async Task AssignMemberPositionsAsync_UniquePositionAlreadyHeldByActive_ThrowsConflict()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithMember(db); // club1, dept1, u1 = membership 1 (Active)
        db.Users.Add(PagedServiceTestHelpers.User(2, "Holder"));
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 2, UserId = "u2", ClubId = 1, DepartmentId = 1,
            ClubRole = ClubRole.MEMBER, Status = MembershipStatus.Active,
            JoinedDate = new DateOnly(2026, 1, 2),
        });
        db.ClubPositions.Add(new ClubPosition
        {
            Id = 1, ClubId = 1, DepartmentId = 1, Name = "Thu quy", IsUnique = true,
        });
        // u2 đang giữ vị trí độc quyền
        db.ClubMemberPositions.Add(new ClubMemberPosition { MembershipId = 2, PositionId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        // Gán cùng vị trí độc quyền đó cho u1 → phải bị chặn
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.AssignMemberPositionsAsync(
                1, 1, new AssignMemberPositionsDto { PositionIds = [1] }, "admin", isSuperAdmin: true));
        Assert.Contains("độc quyền", ex.Message);
    }

    [Fact]
    public async Task AssignMemberPositionsAsync_UniquePositionHeldByResignedMember_AllowsReassign()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithMember(db); // club1, dept1, u1 = membership 1 (Active)
        db.Users.Add(PagedServiceTestHelpers.User(2, "Ex Holder"));
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 2, UserId = "u2", ClubId = 1, DepartmentId = 1,
            ClubRole = ClubRole.MEMBER, Status = MembershipStatus.Resigned,
            JoinedDate = new DateOnly(2025, 1, 1), ResignedDate = new DateOnly(2025, 6, 1),
        });
        db.ClubPositions.Add(new ClubPosition
        {
            Id = 1, ClubId = 1, DepartmentId = 1, Name = "Thu quy", IsUnique = true,
        });
        // Người giữ cũ đã NGHỈ nhưng dòng gán vị trí vẫn còn (không bị dọn khi nghỉ)
        db.ClubMemberPositions.Add(new ClubMemberPosition { MembershipId = 2, PositionId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        // Người cũ đã nghỉ → vị trí coi như trống → gán cho u1 phải THÀNH CÔNG
        var result = await service.AssignMemberPositionsAsync(
            1, 1, new AssignMemberPositionsDto { PositionIds = [1] }, "admin", isSuperAdmin: true);

        Assert.Contains(result.Positions, p => p.Id == 1);
    }

    [Fact]
    public async Task AssignMemberPositionsAsync_MemberWithoutDepartment_AutoJoinsPositionDepartment()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Ky thuat"));
        db.Users.Add(PagedServiceTestHelpers.User(1, "No Dept Member"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u1")); // CHƯA thuộc ban nào
        db.ClubPositions.Add(new ClubPosition { Id = 1, ClubId = 1, DepartmentId = 1, Name = "Developer" });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        await service.AssignMemberPositionsAsync(
            1, 1, new AssignMemberPositionsDto { PositionIds = [1] }, "admin", isSuperAdmin: true);

        var membership = await db.ClubMemberships.FindAsync(1);
        Assert.Equal(1, membership!.DepartmentId); // tự động thêm vào Ban Ky thuat
    }

    [Fact]
    public async Task AssignMemberPositionsAsync_PositionsFromTwoDepartments_Throws()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban A"));
        db.Departments.Add(PagedServiceTestHelpers.Department(2, 1, "Ban B"));
        db.Users.Add(PagedServiceTestHelpers.User(1, "Member"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u1"));
        db.ClubPositions.Add(new ClubPosition { Id = 1, ClubId = 1, DepartmentId = 1, Name = "Vi tri A" });
        db.ClubPositions.Add(new ClubPosition { Id = 2, ClubId = 1, DepartmentId = 2, Name = "Vi tri B" });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        // Gán cùng lúc vị trí của 2 ban khác nhau → chặn (một thành viên chỉ thuộc một ban)
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.AssignMemberPositionsAsync(
                1, 1, new AssignMemberPositionsDto { PositionIds = [1, 2] }, "admin", isSuperAdmin: true));
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
