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

    // Seeds a club + a user and returns a service backed by a real DbContext.
    private async Task<(TaskService svc, UniClubDbContext db)> SetupAsync()
    {
        var db = Fx.CreateDbContext();
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        db.Users.Add(new ApplicationUser
        {
            Id = "u1", UserName = "u1", Email = "u1@test.com",
            NormalizedEmail = "U1@TEST.COM", NormalizedUserName = "U1", SecurityStamp = "x1"
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
            ClubId = 1, Title = "WIP", Status = ClubTaskStatus.Doing,
            Progress = 40, AssignedTo = "u1", CreatedAt = DateTime.UtcNow
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        // Deliberately send Progress = 50: a Done task must be forced to 100%.
        var dto = new UpdateTaskStatusDto { Status = ClubTaskStatus.Done, Progress = 50 };
        await svc.UpdateStatusAsync(task.Id, dto);

        var updated = await db.Tasks.FindAsync(task.Id);
        Assert.Equal(100, updated!.Progress);
        Assert.NotNull(updated.CompletedAt);
    }
}
