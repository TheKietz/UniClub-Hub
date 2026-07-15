using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Implements;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Operations;

public class TaskServiceTests : DbTestBase
{
    public TaskServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    // Seeds a club + two users (u1 = CLUB_ADMIN, u2 = MEMBER) and returns a service backed by a real DbContext.
    private async Task<(TaskService svc, UniClubDbContext db)> SetupAsync()
    {
        var db = Fx.CreateDbContext();
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        db.Users.Add(new ApplicationUser
        {
            Id = "u1", UserName = "u1", Email = "u1@test.com",
            NormalizedEmail = "U1@TEST.COM", NormalizedUserName = "U1", SecurityStamp = "x1"
        });
        db.Users.Add(new ApplicationUser
        {
            Id = "u2", UserName = "u2", Email = "u2@test.com",
            NormalizedEmail = "U2@TEST.COM", NormalizedUserName = "U2", SecurityStamp = "x2"
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1, UserId = "u1", ClubId = 1,
            Status = MembershipStatus.Active, ClubRole = ClubRole.CLUB_ADMIN,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 2, UserId = "u2", ClubId = 1,
            Status = MembershipStatus.Active, ClubRole = ClubRole.MEMBER,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
        });
        await db.SaveChangesAsync();

        var notifications = new Mock<INotificationService>();
        return (new TaskService(
            db,
            notifications.Object,
            Mock.Of<IContributionAwardService>(),
            NullLogger<TaskService>.Instance), db);
    }

    [Fact]
    public async Task CreateTask_WithValidParentId_ShouldSucceed()
    {
        var (svc, db) = await SetupAsync();
        var parent = new ClubTask { ClubId = 1, Title = "Parent", Status = ClubTaskStatus.Todo, CreatedAt = DateTime.UtcNow };
        db.Tasks.Add(parent);
        await db.SaveChangesAsync();

        var dto = new CreateTaskDto { Title = "Child", Priority = TaskPriority.Medium, ParentId = parent.Id };
        var result = await svc.CreateAsync(1, dto, "u1");

        Assert.NotEqual(0, result.Id);
        var created = await db.Tasks.FindAsync(result.Id);
        Assert.Equal(parent.Id, created!.ParentId);
    }

    [Fact]
    public async Task CreateTask_WithInvalidParentId_ShouldThrowNotFoundException()
    {
        var (svc, _) = await SetupAsync();
        var dto = new CreateTaskDto { Title = "Orphan", Priority = TaskPriority.Medium, ParentId = 999999 };

        await Assert.ThrowsAsync<KeyNotFoundException>(() => svc.CreateAsync(1, dto, "u1"));
    }

    [Fact]
    public async Task UpdateStatus_ToDone_ShouldSetCompletedAtAndProgress100()
    {
        var (svc, db) = await SetupAsync();
        var task = new ClubTask
        {
            ClubId = 1, Title = "WIP", Status = ClubTaskStatus.Reviewing,
            Progress = 80, AssignedTo = "u1", CreatedAt = DateTime.UtcNow
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        // Deliberately send Progress = 50: a Done task must be forced to 100%.
        var dto = new UpdateTaskStatusDto { Status = ClubTaskStatus.Done, Progress = 50 };
        await svc.UpdateStatusAsync(task.Id, dto, "u1");

        var updated = await db.Tasks.FindAsync(task.Id);
        Assert.Equal(100, updated!.Progress);
        Assert.NotNull(updated.CompletedAt);
    }

    [Fact]
    public async Task UpdateStatus_ToDone_WithoutReviewing_ReturnsError()
    {
        var (svc, db) = await SetupAsync();
        var task = new ClubTask { ClubId = 1, Title = "WIP", Status = ClubTaskStatus.Doing, CreatedAt = DateTime.UtcNow };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        // Even a CLUB_ADMIN cannot skip the review step.
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.UpdateStatusAsync(task.Id, new UpdateTaskStatusDto { Status = ClubTaskStatus.Done, Progress = 100 }, "u1"));
    }

    [Fact]
    public async Task UpdateStatus_ToDone_ByMember_ReturnsUnauthorized()
    {
        var (svc, db) = await SetupAsync();
        var task = new ClubTask { ClubId = 1, Title = "WIP", Status = ClubTaskStatus.Reviewing, CreatedAt = DateTime.UtcNow };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            svc.UpdateStatusAsync(task.Id, new UpdateTaskStatusDto { Status = ClubTaskStatus.Done, Progress = 100 }, "u2"));
    }

    [Fact]
    public async Task UpdateStatus_OutOfDone_ByMember_ReturnsUnauthorized()
    {
        var (svc, db) = await SetupAsync();
        var task = new ClubTask
        {
            ClubId = 1, Title = "Done task", Status = ClubTaskStatus.Done,
            Progress = 100, CompletedAt = DateTimeOffset.UtcNow, CreatedAt = DateTime.UtcNow
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            svc.UpdateStatusAsync(task.Id, new UpdateTaskStatusDto { Status = ClubTaskStatus.Doing, Progress = 50 }, "u2"));
    }

    [Fact]
    public async Task UpdateStatus_ToDone_WithOpenSubTasks_ReturnsError()
    {
        var (svc, db) = await SetupAsync();
        var parent = new ClubTask { ClubId = 1, Title = "Parent", Status = ClubTaskStatus.Reviewing, CreatedAt = DateTime.UtcNow };
        db.Tasks.Add(parent);
        await db.SaveChangesAsync();
        db.Tasks.Add(new ClubTask { ClubId = 1, Title = "Child", Status = ClubTaskStatus.Doing, ParentId = parent.Id, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.UpdateStatusAsync(parent.Id, new UpdateTaskStatusDto { Status = ClubTaskStatus.Done, Progress = 100 }, "u1"));
    }

    [Fact]
    public async Task UpdateStatus_ToDone_WithAllSubTasksDone_ShouldSucceed()
    {
        var (svc, db) = await SetupAsync();
        var parent = new ClubTask { ClubId = 1, Title = "Parent", Status = ClubTaskStatus.Reviewing, CreatedAt = DateTime.UtcNow };
        db.Tasks.Add(parent);
        await db.SaveChangesAsync();
        db.Tasks.Add(new ClubTask { ClubId = 1, Title = "Child", Status = ClubTaskStatus.Done, ParentId = parent.Id, Progress = 100, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var result = await svc.UpdateStatusAsync(parent.Id, new UpdateTaskStatusDto { Status = ClubTaskStatus.Done, Progress = 100 }, "u1");

        Assert.Equal(ClubTaskStatus.Done, result.Status);
    }

    [Fact]
    public async Task UpdateStatus_ByNonAssignedMember_ReturnsUnauthorized()
    {
        var (svc, db) = await SetupAsync();
        var task = new ClubTask { ClubId = 1, Title = "Việc của u1", AssignedTo = "u1", Status = ClubTaskStatus.Todo, CreatedAt = DateTime.UtcNow };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        // u2 is a MEMBER and not assigned to this task.
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            svc.UpdateStatusAsync(task.Id, new UpdateTaskStatusDto { Status = ClubTaskStatus.Doing, Progress = 50 }, "u2"));
    }

    [Fact]
    public async Task UpdateStatus_ByAssignedMember_ShouldSucceed()
    {
        var (svc, db) = await SetupAsync();
        var task = new ClubTask { ClubId = 1, Title = "Việc của u2", AssignedTo = "u2", Status = ClubTaskStatus.Todo, CreatedAt = DateTime.UtcNow };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        var result = await svc.UpdateStatusAsync(task.Id, new UpdateTaskStatusDto { Status = ClubTaskStatus.Doing, Progress = 50 }, "u2");

        Assert.Equal(ClubTaskStatus.Doing, result.Status);
    }

    [Fact]
    public async Task UpdateTask_ByMember_ReturnsUnauthorized()
    {
        var (svc, db) = await SetupAsync();
        var task = new ClubTask { ClubId = 1, Title = "Việc", AssignedTo = "u2", Status = ClubTaskStatus.Todo, CreatedAt = DateTime.UtcNow };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        // Even the assignee cannot edit task fields if they are only a MEMBER.
        var dto = new UpdateTaskDto { Title = "Đổi tên", Priority = TaskPriority.High };
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.UpdateAsync(task.Id, dto, "u2"));
    }

    [Fact]
    public async Task CreateTask_WithDeadlineAfterEventEnd_ReturnsError()
    {
        var (svc, db) = await SetupAsync();
        db.Events.Add(new ClubEvent { Id = 20, ClubId = 1, Name = "Hội thao", CreatedBy = "u1", EndTime = DateTimeOffset.UtcNow.AddDays(3) });
        await db.SaveChangesAsync();

        var dto = new CreateTaskDto
        {
            Title = "Trễ hạn", Priority = TaskPriority.Medium,
            EventId = 20, Deadline = DateTimeOffset.UtcNow.AddDays(10),
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(1, dto, "u1"));
    }

    [Fact]
    public async Task CreateTask_WithDeadlineWithinEventWindow_ShouldSucceed()
    {
        var (svc, db) = await SetupAsync();
        db.Events.Add(new ClubEvent { Id = 21, ClubId = 1, Name = "Hội thao", CreatedBy = "u1", EndTime = DateTimeOffset.UtcNow.AddDays(5) });
        await db.SaveChangesAsync();

        var dto = new CreateTaskDto
        {
            Title = "Đúng hạn", Priority = TaskPriority.Medium,
            EventId = 21, Deadline = DateTimeOffset.UtcNow.AddDays(2),
        };

        var result = await svc.CreateAsync(1, dto, "u1");
        Assert.NotEqual(0, result.Id);
    }

    [Fact]
    public async Task UpdateTask_WithoutEventId_PreservesEventId()
    {
        var (svc, db) = await SetupAsync();
        db.Events.Add(new ClubEvent { Id = 10, ClubId = 1, Name = "Workshop", CreatedBy = "u1" });
        var task = new ClubTask { ClubId = 1, Title = "Event task", EventId = 10, Status = ClubTaskStatus.Todo, CreatedAt = DateTime.UtcNow };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        // A partial PUT that omits EventId (e.g. Kanban detail modal) must not detach the task from its event.
        var dto = new UpdateTaskDto { Title = "Renamed", Priority = TaskPriority.High };
        var result = await svc.UpdateAsync(task.Id, dto);

        Assert.Equal(10, result.EventId);
    }
}
