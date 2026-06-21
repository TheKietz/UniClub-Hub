using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ClubPermissionServiceTests : DbTestBase
{
    public ClubPermissionServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task GetEffectivePermissions_WhenSuperAdmin_ReturnsAllPermissions()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        await db.SaveChangesAsync();

        var service = new ClubPermissionService(db);
        var result = await service.GetEffectivePermissionsAsync(1, "any-user", isSuperAdmin: true);

        Assert.True(result.IsSuperAdmin);
        Assert.True(result.IsClubAdmin);
        Assert.Equal(ClubPermissions.All.Count, result.PermissionCodes.Count);
    }

    [Fact]
    public async Task GetEffectivePermissions_WhenClubAdminActive_ReturnsAllPermissions()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        SeedUser(db, "admin", "admin@uef.edu.vn");
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1,
            ClubId = 1,
            UserId = "admin",
            ClubRole = ClubRole.CLUB_ADMIN,
            Status = MembershipStatus.Active,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
        });
        await db.SaveChangesAsync();

        var service = new ClubPermissionService(db);
        var result = await service.GetEffectivePermissionsAsync(1, "admin", isSuperAdmin: false);

        Assert.True(result.IsClubAdmin);
        Assert.Equal(ClubPermissions.All.Count, result.PermissionCodes.Count);
    }

    [Fact]
    public async Task GetEffectivePermissions_WhenNoMembership_ThrowsUnauthorized()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        await db.SaveChangesAsync();

        var service = new ClubPermissionService(db);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.GetEffectivePermissionsAsync(1, "stranger", isSuperAdmin: false));
    }

    [Fact]
    public async Task GetEffectivePermissions_WhenInactiveMembership_ThrowsUnauthorized()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        SeedUser(db, "member", "member@uef.edu.vn");
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1,
            ClubId = 1,
            UserId = "member",
            ClubRole = ClubRole.MEMBER,
            Status = MembershipStatus.Resigned,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
        });
        await db.SaveChangesAsync();

        var service = new ClubPermissionService(db);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.GetEffectivePermissionsAsync(1, "member", isSuperAdmin: false));
    }

    [Fact]
    public async Task GetEffectivePermissions_WhenMemberWithPosition_ReturnsOnlyPositionPermissions()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        SeedUser(db, "member", "member@uef.edu.vn");
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1,
            ClubId = 1,
            UserId = "member",
            ClubRole = ClubRole.MEMBER,
            Status = MembershipStatus.Active,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
        });
        db.ClubPositions.Add(new ClubPosition { Id = 1, ClubId = 1, Name = "Reviewer" });
        db.ClubPositionPermissions.Add(new ClubPositionPermission
        {
            PositionId = 1,
            PermissionCode = ClubPermissions.ApplicationsView,
        });
        db.ClubMemberPositions.Add(new ClubMemberPosition { MembershipId = 1, PositionId = 1 });
        await db.SaveChangesAsync();

        var service = new ClubPermissionService(db);
        var result = await service.GetEffectivePermissionsAsync(1, "member", isSuperAdmin: false);

        Assert.Single(result.PermissionCodes);
        Assert.Equal(ClubPermissions.ApplicationsView, result.PermissionCodes[0]);
    }

    [Fact]
    public async Task GetEffectivePermissions_WhenClubNotFound_ThrowsKeyNotFound()
    {
        await using var db = Fx.CreateDbContext();
        var service = new ClubPermissionService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            service.GetEffectivePermissionsAsync(999, "member", isSuperAdmin: false));
    }

    [Fact]
    public async Task EnsureHasPermission_WhenLacksPermission_ThrowsUnauthorized()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        SeedUser(db, "member", "member@uef.edu.vn");
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1,
            ClubId = 1,
            UserId = "member",
            ClubRole = ClubRole.MEMBER,
            Status = MembershipStatus.Active,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
        });
        await db.SaveChangesAsync();

        var service = new ClubPermissionService(db);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.EnsureHasPermissionAsync(1, "member", isSuperAdmin: false, ClubPermissions.MembersManage));
    }

    [Fact]
    public async Task EnsureHasPermission_WhenHasPermission_DoesNotThrow()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        SeedUser(db, "admin", "admin@uef.edu.vn");
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1,
            ClubId = 1,
            UserId = "admin",
            ClubRole = ClubRole.CLUB_ADMIN,
            Status = MembershipStatus.Active,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
        });
        await db.SaveChangesAsync();

        var service = new ClubPermissionService(db);
        var ex = await Record.ExceptionAsync(() =>
            service.EnsureHasPermissionAsync(1, "admin", isSuperAdmin: false, ClubPermissions.MembersManage));
        Assert.Null(ex);
    }

    [Fact]
    public async Task HasPermission_WithUnknownCode_ReturnsFalse()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        SeedUser(db, "admin", "admin@uef.edu.vn");
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1,
            ClubId = 1,
            UserId = "admin",
            ClubRole = ClubRole.CLUB_ADMIN,
            Status = MembershipStatus.Active,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
        });
        await db.SaveChangesAsync();

        var service = new ClubPermissionService(db);
        var result = await service.HasPermissionAsync(1, "admin", isSuperAdmin: false, "not.a.real.permission");

        Assert.False(result);
    }

    private static void SeedClub(UniClubDbContext db) =>
        db.Clubs.Add(new Club { Id = 1, Name = "Test CLB", Code = "T" });

    private static void SeedUser(UniClubDbContext db, string id, string email) =>
        db.Users.Add(new ApplicationUser
        {
            Id = id,
            UserName = email,
            NormalizedUserName = email.ToUpperInvariant(),
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            SecurityStamp = Guid.NewGuid().ToString(),
        });
}
