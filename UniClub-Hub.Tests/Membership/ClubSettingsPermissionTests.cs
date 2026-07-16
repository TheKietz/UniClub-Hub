using Moq;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ClubSettingsPermissionTests : DbTestBase
{
    public ClubSettingsPermissionTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task UpdateSettingsAsync_WithoutClubSettingsManagePermission_ThrowsUnauthorizedAccess()
    {
        await using var db = Fx.CreateDbContext();
        SeedMember(db);
        await db.SaveChangesAsync();

        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.UpdateSettingsAsync(1, new UpdateClubSettingsDto { Description = "New" }, "member", isSuperAdmin: false));
    }

    [Fact]
    public async Task UpdateSettingsAsync_WithClubSettingsManagePermission_PersistsSettingsAndAudit()
    {
        await using var db = Fx.CreateDbContext();
        SeedMember(db);
        db.ClubPositions.Add(new ClubPosition { Id = 1, ClubId = 1, Name = "Cai dat CLB" });
        db.ClubPositionPermissions.Add(new ClubPositionPermission
        {
            PositionId = 1,
            PermissionCode = ClubPermissions.ClubSettingsManage
        });
        db.ClubMemberPositions.Add(new ClubMemberPosition { MembershipId = 1, PositionId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.UpdateSettingsAsync(
            1,
            new UpdateClubSettingsDto
            {
                Description = "Mo ta moi",
                ContactInfo = "club@uef.edu.vn",
                AdvisorName = "Thay Co Van",
                LogoUrl = "https://cdn.example/logo.png"
            },
            "member",
            isSuperAdmin: false);

        var club = db.Clubs.Single(c => c.Id == 1);
        Assert.Equal("Mo ta moi", result.Description);
        Assert.Equal("club@uef.edu.vn", club.ContactInfo);
        Assert.Equal("Thay Co Van", club.AdvisorName);
        Assert.Equal("https://cdn.example/logo.png", club.LogoUrl);
        Assert.NotNull(club.UpdatedAt);
    }

    private static ClubService CreateService(UniClubDbContext db) =>
        new(
            db,
            Mock.Of<ISystemSettingService>(),
            new ClubPermissionService(db));

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
