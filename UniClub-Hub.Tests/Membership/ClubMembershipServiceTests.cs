using Moq;
using UniClub_Hub.Membership.DTOs.Membership;
using Xunit;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;

namespace UniClub_Hub.Tests.Membership;

public class ClubMembershipServiceTests : DbTestBase
{
    public ClubMembershipServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    private (ClubMembershipService service, Shared.Data.UniClubDbContext db) Setup(
        Action<Shared.Data.UniClubDbContext> seed)
    {
        var db = Fx.CreateDbContext();

        var dispatch = new Mock<INotificationDispatchService>();
        dispatch.Setup(d => d.FireAsync(
            It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, string>>()))
            .Returns(Task.CompletedTask);

        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync("club.max_members")).ReturnsAsync((string?)null);

        var perm = new Mock<IClubPermissionService>();
        perm.Setup(p => p.EnsureHasPermissionAsync(
            It.IsAny<int>(),
            It.IsAny<string>(),
            It.IsAny<bool>(),
            It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        seed(db);
        db.SaveChanges();

        return (new ClubMembershipService(db, dispatch.Object, settings.Object, perm.Object), db);
    }

    private static void SeedClubAndUser(
        Shared.Data.UniClubDbContext db,
        string userId = "u1",
        ClubRole role = ClubRole.MEMBER,
        MembershipStatus status = MembershipStatus.Active,
        int membershipId = 1)
    {
        db.Clubs.Add(new Club { Id = 1, Name = "Test CLB", Code = "T" });
        db.Users.Add(new ApplicationUser
        {
            Id = userId, UserName = userId,
            NormalizedUserName = userId.ToUpper(), SecurityStamp = Guid.NewGuid().ToString()
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = membershipId, UserId = userId, ClubId = 1,
            Status = status,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ClubRole = role
        });
    }

    // ─── PromoteMemberAsync ────────────────────────────────────────────────

    [Fact]
    public async Task PromoteMemberAsync_WithProbationMember_SetsStatusToActive()
    {
        var (svc, db) = Setup(d => SeedClubAndUser(d, status: MembershipStatus.Probation));

        await svc.PromoteMemberAsync(clubId: 1, membershipId: 1, requesterUserId: "admin", isSuperAdmin: true);

        Assert.Equal(MembershipStatus.Active, db.ClubMemberships.Find(1)!.Status);
    }

    [Fact]
    public async Task PromoteMemberAsync_WithActiveMember_ThrowsInvalidOperation()
    {
        var (svc, _) = Setup(d => SeedClubAndUser(d, status: MembershipStatus.Active));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.PromoteMemberAsync(clubId: 1, membershipId: 1, requesterUserId: "admin", isSuperAdmin: true));
    }

    // ─── ResignAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task ResignAsync_WithClubAdmin_ThrowsNeedsResignationRequest()
    {
        var (svc, _) = Setup(d => SeedClubAndUser(d, role: ClubRole.CLUB_ADMIN));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.ResignAsync(clubId: 1, userId: "u1"));

        Assert.Contains("NEEDS_RESIGNATION_REQUEST", ex.Message);
    }

    [Fact]
    public async Task ResignAsync_WithDeptLead_ThrowsNeedsResignationRequest()
    {
        var (svc, _) = Setup(d => SeedClubAndUser(d, role: ClubRole.DEPT_LEAD));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.ResignAsync(clubId: 1, userId: "u1"));

        Assert.Contains("NEEDS_RESIGNATION_REQUEST", ex.Message);
    }

    [Fact]
    public async Task ResignAsync_WithMember_SetsStatusToResigned()
    {
        var (svc, db) = Setup(d => SeedClubAndUser(d, role: ClubRole.MEMBER));

        await svc.ResignAsync(clubId: 1, userId: "u1");

        var m = db.ClubMemberships.Find(1)!;
        Assert.Equal(MembershipStatus.Resigned, m.Status);
        Assert.NotNull(m.ResignedDate);
    }

    // ─── RemoveMemberAsAdminAsync ────────────────────────────────────────────

    [Fact]
    public async Task RemoveMemberAsAdminAsync_LastAdminWithoutForce_ThrowsLastClubAdmin()
    {
        var (svc, _) = Setup(d => SeedClubAndUser(d, role: ClubRole.CLUB_ADMIN));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.RemoveMemberAsAdminAsync(clubId: 1, membershipId: 1));

        Assert.Contains("LAST_CLUB_ADMIN", ex.Message);
    }

    [Fact]
    public async Task RemoveMemberAsAdminAsync_LastAdminWithForce_SetsStatusToResigned()
    {
        var (svc, db) = Setup(d => SeedClubAndUser(d, role: ClubRole.CLUB_ADMIN));

        await svc.RemoveMemberAsAdminAsync(clubId: 1, membershipId: 1, force: true);

        Assert.Equal(MembershipStatus.Resigned, db.ClubMemberships.Find(1)!.Status);
    }

    // ─── AddMemberAsAdminAsync ────────────────────────────────────────────────

    [Fact]
    public async Task AddMemberAsAdminAsync_WhenClubAlreadyHasAdmin_ThrowsInvalidOperation()
    {
        var (svc, _) = Setup(db =>
        {
            db.Clubs.Add(new Club { Id = 1, Name = "Test CLB", Code = "T" });
            db.Users.Add(new ApplicationUser { Id = "u1", UserName = "u1", NormalizedUserName = "U1", SecurityStamp = "s1" });
            db.Users.Add(new ApplicationUser { Id = "u2", UserName = "u2", NormalizedUserName = "U2", SecurityStamp = "s2" });
            db.ClubMemberships.Add(new ClubMembership
            {
                Id = 1, UserId = "u1", ClubId = 1,
                Status = MembershipStatus.Active,
                JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ClubRole = ClubRole.CLUB_ADMIN
            });
            db.ClubMemberships.Add(new ClubMembership
            {
                Id = 2, UserId = "u2", ClubId = 1,
                Status = MembershipStatus.Active,
                JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ClubRole = ClubRole.MEMBER
            });
        });

        // u1 is already CLUB_ADMIN, adding u2 as CLUB_ADMIN should fail
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.AddMemberAsAdminAsync(1, new AddMemberDto { UserId = "u2", ClubRole = ClubRole.CLUB_ADMIN }));
    }
}
