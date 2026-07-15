using Microsoft.EntityFrameworkCore;
using Moq;
using UniClub_Hub.Operations.Services.Implements;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Operations;

public class EventAssignmentServiceTests : DbTestBase
{
    public EventAssignmentServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    // Seeds a club + a 7-day event and returns the service with a real DbContext.
    private async Task<(EventAssignmentService svc, int eventId)> SetupAsync()
    {
        var db = Fx.CreateDbContext();
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        var ev = new ClubEvent
        {
            ClubId = 1, Name = "Sự kiện Test", Status = EventStatus.InProgress,
            StartTime = DateTimeOffset.UtcNow, EndTime = DateTimeOffset.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        var fileStorage = new Mock<IFileStorageService>();
        return (new EventAssignmentService(db, fileStorage.Object), ev.Id);
    }

    [Fact]
    public async Task CreateAssignment_WithDeadlineInEventRange_ShouldSucceed()
    {
        var (svc, eventId) = await SetupAsync();
        var deadline = DateTimeOffset.UtcNow.AddDays(3); // within [start, end]

        var result = await svc.CreateAsync(
            eventId, clubId: 1, title: "Phiếu việc", description: null,
            priority: TaskPriority.Medium, deadline: deadline, actorId: "u1", files: null);

        Assert.NotEqual(0, result.Id);
    }

    [Fact]
    public async Task CreateAssignment_WithDeadlineOutOfRange_ShouldThrowValidationException()
    {
        var (svc, eventId) = await SetupAsync();
        var deadline = DateTimeOffset.UtcNow.AddDays(30); // after the event ends

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.CreateAsync(
                eventId, clubId: 1, title: "Phiếu việc", description: null,
                priority: TaskPriority.Medium, deadline: deadline, actorId: "u1", files: null));
    }

    // ── Remove cancelled slip (club admin) ────────────────────────────────────

    // Seeds a club (admin1 = CLUB_ADMIN, member1 = MEMBER), an event, one slip
    // with the given status and one task the club created from it.
    private async Task<(EventAssignmentService svc, UniClub_Hub.Shared.Data.UniClubDbContext db, int assignmentId, int eventId)> SetupSlipAsync(string slipStatus)
    {
        var db = Fx.CreateDbContext();
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        db.Users.Add(new ApplicationUser
        {
            Id = "admin1", UserName = "admin1", Email = "admin1@test.com",
            NormalizedEmail = "ADMIN1@TEST.COM", NormalizedUserName = "ADMIN1", SecurityStamp = "x1"
        });
        db.Users.Add(new ApplicationUser
        {
            Id = "member1", UserName = "member1", Email = "member1@test.com",
            NormalizedEmail = "MEMBER1@TEST.COM", NormalizedUserName = "MEMBER1", SecurityStamp = "x2"
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1, UserId = "admin1", ClubId = 1,
            Status = MembershipStatus.Active, ClubRole = ClubRole.CLUB_ADMIN,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 2, UserId = "member1", ClubId = 1,
            Status = MembershipStatus.Active, ClubRole = ClubRole.MEMBER,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
        });
        var ev = new ClubEvent { Name = "Hội trại toàn trường", CreatedBy = "uni" };
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        var slip = new EventClubAssignment
        {
            EventId = ev.Id, ClubId = 1,
            Title = "Chuẩn bị hậu cần", Status = slipStatus, CreatedBy = "uni",
        };
        db.EventClubAssignments.Add(slip);
        db.Tasks.Add(new ClubTask
        {
            ClubId = 1, EventId = ev.Id, Title = "Dựng rạp",
            Status = ClubTaskStatus.Doing, CreatedBy = "admin1",
        });
        await db.SaveChangesAsync();

        return (new EventAssignmentService(db, Mock.Of<IFileStorageService>()), db, slip.Id, ev.Id);
    }

    [Fact]
    public async Task RemoveCancelled_ByClubAdmin_RemovesSlipAndSoftDeletesTasks()
    {
        var (svc, db, assignmentId, eventId) = await SetupSlipAsync("Cancelled");

        await svc.RemoveCancelledAsync(assignmentId, "admin1");

        Assert.Null(await db.EventClubAssignments.FindAsync(assignmentId));
        // ExecuteUpdate bypasses the change tracker — read the DB truth directly.
        var task = await db.Tasks.IgnoreQueryFilters().AsNoTracking()
            .FirstAsync(t => t.EventId == eventId && t.ClubId == 1);
        Assert.True(task.IsDeleted);
        Assert.Equal("admin1", task.DeletedBy);
    }

    [Fact]
    public async Task RemoveCancelled_WhenNotCancelled_ReturnsError()
    {
        var (svc, _, assignmentId, _) = await SetupSlipAsync("Pending");

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.RemoveCancelledAsync(assignmentId, "admin1"));
    }

    [Fact]
    public async Task RemoveCancelled_ByMember_ReturnsUnauthorized()
    {
        var (svc, _, assignmentId, _) = await SetupSlipAsync("Cancelled");

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.RemoveCancelledAsync(assignmentId, "member1"));
    }

    [Fact]
    public async Task Cancel_SetsCancelledStatus_AndKeepsSlip()
    {
        var (svc, db, assignmentId, _) = await SetupSlipAsync("Pending");

        var dto = await svc.CancelAsync(assignmentId);

        Assert.Equal("Cancelled", dto.Status);
        Assert.NotNull(await db.EventClubAssignments.FindAsync(assignmentId));
    }
}
