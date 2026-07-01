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
}
