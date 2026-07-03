using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using UniClub_Hub.Operations.DTOs.Task;
using UniClub_Hub.Operations.Services.Implements;
using UniClub_Hub.Shared.Common.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Operations;

public class ContributionAwardServiceTests : DbTestBase
{
    public ContributionAwardServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task AwardTaskCompletion_MultipleActiveAssignees_CreatesOneContributionEach()
    {
        await using var db = await SeedTaskAsync(includeSecondAssignee: true);
        var task = await db.Tasks.Include(t => t.Assignees).FirstAsync(t => t.Id == 1);
        var service = new ContributionAwardService(db);

        await service.AwardTaskCompletionAsync(task);
        await db.SaveChangesAsync();

        var contributions = await db.Contributions
            .OrderBy(c => c.UserId)
            .ToListAsync();

        Assert.Equal(2, contributions.Count);
        Assert.All(contributions, c =>
        {
            Assert.Equal(ActivityType.Task, c.ActivityType);
            Assert.Equal(ContributionPoints.TaskHigh, c.Points);
            Assert.Equal(1, c.TaskId);
        });
        var userIds = contributions.Select(c => c.UserId).OrderBy(x => x).ToList();
        Assert.Equal(new List<string> { "u1", "u2" }, userIds);
    }

    [Fact]
    public async Task UpdateStatus_DoneToDoing_RemovesTaskContributions()
    {
        await using var db = await SeedTaskAsync(done: true, existingContribution: true);
        var awardService = new ContributionAwardService(db);
        var taskService = new TaskService(
            db,
            Mock.Of<INotificationService>(),
            awardService,
            NullLogger<TaskService>.Instance);

        await taskService.UpdateStatusAsync(1, new UpdateTaskStatusDto
        {
            Status = ClubTaskStatus.Doing,
            Progress = 50,
        });

        Assert.Empty(await db.Contributions
            .Where(c => c.TaskId == 1 && c.ActivityType == ActivityType.Task)
            .ToListAsync());
    }

    [Fact]
    public async Task AwardTaskCompletion_AlreadyAwarded_DoesNotDuplicate()
    {
        await using var db = await SeedTaskAsync(existingContribution: true);
        var task = await db.Tasks.Include(t => t.Assignees).FirstAsync(t => t.Id == 1);
        var service = new ContributionAwardService(db);

        await service.AwardTaskCompletionAsync(task);
        await service.AwardTaskCompletionAsync(task);
        await db.SaveChangesAsync();

        Assert.Single(await db.Contributions
            .Where(c => c.TaskId == 1 && c.UserId == "u1" && c.ActivityType == ActivityType.Task)
            .ToListAsync());
    }

    [Fact]
    public async Task AwardEventCheckIn_FirstCheckIn_CreatesContribution()
    {
        await using var db = await SeedEventAsync();
        var service = new ContributionAwardService(db);

        await service.AwardEventCheckInAsync(1, "u1");
        await db.SaveChangesAsync();

        var contribution = await db.Contributions.SingleAsync();
        Assert.Equal("u1", contribution.UserId);
        Assert.Equal(1, contribution.ClubId);
        Assert.Equal(1, contribution.EventId);
        Assert.Equal(ActivityType.Event, contribution.ActivityType);
        Assert.Equal(ContributionPoints.EventCheckIn, contribution.Points);
    }

    private async Task<UniClubDbContext> SeedTaskAsync(
        bool includeSecondAssignee = false,
        bool done = false,
        bool existingContribution = false)
    {
        var db = Fx.CreateDbContext();
        SeedClubAndUsers(db, includeSecondUser: includeSecondAssignee);

        db.Tasks.Add(new ClubTask
        {
            Id = 1,
            ClubId = 1,
            Title = "Thiết kế poster",
            Priority = TaskPriority.High,
            AssignedTo = "u1",
            Status = done ? ClubTaskStatus.Done : ClubTaskStatus.Doing,
            CompletedAt = done ? DateTimeOffset.UtcNow : null,
            CreatedBy = "admin",
        });

        if (includeSecondAssignee)
        {
            db.TaskAssignees.Add(new TaskAssignee
            {
                TaskId = 1,
                UserId = "u2",
                AssignedBy = "admin",
            });
        }

        if (existingContribution)
        {
            db.Contributions.Add(new Contribution
            {
                UserId = "u1",
                ClubId = 1,
                TaskId = 1,
                ActivityType = ActivityType.Task,
                Points = ContributionPoints.TaskHigh,
                Note = "Existing",
                RecordedAt = DateTimeOffset.UtcNow,
            });
        }

        await db.SaveChangesAsync();
        return db;
    }

    private async Task<UniClubDbContext> SeedEventAsync()
    {
        var db = Fx.CreateDbContext();
        SeedClubAndUsers(db);

        db.Events.Add(new ClubEvent
        {
            Id = 1,
            ClubId = 1,
            Name = "Workshop AI",
            CreatedBy = "admin",
        });
        db.EventRegistrations.Add(new EventRegistration
        {
            EventId = 1,
            UserId = "u1",
            Attendance = AttendanceStatus.CheckedIn,
            CheckedInAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync();
        return db;
    }

    private static void SeedClubAndUsers(UniClubDbContext db, bool includeSecondUser = false)
    {
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        db.Users.Add(new ApplicationUser
        {
            Id = "u1",
            UserName = "u1",
            NormalizedUserName = "U1",
            Email = "u1@test.com",
            NormalizedEmail = "U1@TEST.COM",
            SecurityStamp = "s1",
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1,
            UserId = "u1",
            ClubId = 1,
            Status = MembershipStatus.Active,
            ClubRole = ClubRole.MEMBER,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
        });

        if (!includeSecondUser)
            return;

        db.Users.Add(new ApplicationUser
        {
            Id = "u2",
            UserName = "u2",
            NormalizedUserName = "U2",
            Email = "u2@test.com",
            NormalizedEmail = "U2@TEST.COM",
            SecurityStamp = "s2",
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 2,
            UserId = "u2",
            ClubId = 1,
            Status = MembershipStatus.Active,
            ClubRole = ClubRole.MEMBER,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
        });
    }
}
