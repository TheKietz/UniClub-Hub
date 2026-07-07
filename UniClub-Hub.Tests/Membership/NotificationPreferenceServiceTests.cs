using Moq;
using UniClub_Hub.Membership.DTOs.NotificationPreference;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class NotificationPreferenceServiceTests : DbTestBase
{
    public NotificationPreferenceServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task UpsertGlobalAsync_WhenChannelChanges_NotifiesClubAdminsWithoutOverride()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "CLB A", "A"));
        db.Clubs.Add(PagedServiceTestHelpers.Club(2, "CLB B", "B"));
        db.Users.Add(PagedServiceTestHelpers.User(1, "Admin A", "admin-a@uef.edu.vn", "S001"));
        db.Users.Add(PagedServiceTestHelpers.User(2, "Admin B", "admin-b@uef.edu.vn", "S002"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u1", clubId: 1, role: ClubRole.CLUB_ADMIN));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(2, "u2", clubId: 2, role: ClubRole.CLUB_ADMIN));
        db.NotificationPreferences.Add(new NotificationPreference
        {
            ClubId = 2,
            TriggerKey = NotificationTriggers.ApplicationSubmitted,
            RecipientRole = NotificationRecipientRoles.ClubAdmin,
            InAppEnabled = true,
            EmailEnabled = false,
        });
        await db.SaveChangesAsync();

        var notifications = new Mock<INotificationService>();
        var svc = new NotificationPreferenceService(
            db,
            PagedServiceTestHelpers.CreatePermissivePermissionMock().Object,
            notifications.Object);

        await svc.UpsertGlobalAsync(
            NotificationTriggers.ApplicationSubmitted,
            NotificationRecipientRoles.ClubAdmin,
            new UpdateNotificationPreferenceDto { InAppEnabled = false, EmailEnabled = false },
            "super-admin");

        notifications.Verify(
            n => n.SendAsync(
                "u1",
                It.IsAny<string>(),
                It.Is<string>(m => m.Contains("Có đơn đăng ký mới")),
                NotificationType.System,
                null,
                null,
                "Club",
                1),
            Times.Once);

        notifications.Verify(
            n => n.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<NotificationType>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<int?>()),
            Times.Once);
    }

    [Fact]
    public async Task GetForClubAsync_ReturnsGlobalDefaultsWhenNoOverride()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "CLB A", "A"));
        db.NotificationPreferences.Add(new NotificationPreference
        {
            ClubId = null,
            TriggerKey = NotificationTriggers.ApplicationSubmitted,
            RecipientRole = NotificationRecipientRoles.ClubAdmin,
            InAppEnabled = false,
            EmailEnabled = false,
        });
        await db.SaveChangesAsync();

        var notifications = new Mock<INotificationService>();
        var svc = new NotificationPreferenceService(
            db,
            PagedServiceTestHelpers.CreatePermissivePermissionMock().Object,
            notifications.Object);

        var prefs = (await svc.GetForClubAsync(1)).ToList();
        var item = prefs.First(p =>
            p.TriggerKey == NotificationTriggers.ApplicationSubmitted
            && p.RecipientRole == NotificationRecipientRoles.ClubAdmin);

        Assert.False(item.IsOverride);
        Assert.False(item.InAppEnabled);
        Assert.False(item.GlobalInAppEnabled);
        Assert.False(item.GlobalEmailEnabled);
    }
}
