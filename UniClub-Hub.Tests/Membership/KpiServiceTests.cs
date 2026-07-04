using Moq;
using UniClub_Hub.Membership.DTOs.Kpi;
using Xunit;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;

namespace UniClub_Hub.Tests.Membership;

public class KpiServiceTests : DbTestBase
{
    public KpiServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    private async Task<(KpiService service, UniClubDbContext db)> SetupAsync(
        Action<UniClubDbContext>? seed = null)
    {
        var db = Fx.CreateDbContext();
        var perm = new Mock<IClubPermissionService>();

        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        db.Users.Add(new ApplicationUser
        {
            Id = "u1", UserName = "u1", Email = "u1@test.com",
            NormalizedEmail = "U1@TEST.COM", NormalizedUserName = "U1", SecurityStamp = "x1"
        });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1, UserId = "u1", ClubId = 1,
            Status = MembershipStatus.Active,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ClubRole = ClubRole.MEMBER
        });

        seed?.Invoke(db);
        await db.SaveChangesAsync();

        return (new KpiService(db, perm.Object), db);
    }

    [Fact]
    public async Task GetMyResultAsync_WithNoTasksOrContributions_ReturnsZeroScoreAndLowestGrade()
    {
        var (svc, _) = await SetupAsync();

        var result = await svc.GetMyResultAsync(1, null, null, "u1", isSuperAdmin: true);

        Assert.Equal(0, result.TotalScore);
        Assert.Equal("Cần cải thiện", result.Grade);
    }

    [Fact]
    public async Task GetMyResultAsync_WithAllTasksDoneAndContributions_ReturnsMaxScoreAndTopGrade()
    {
        var (svc, _) = await SetupAsync(db =>
        {
            var now = DateTimeOffset.UtcNow;
            for (var i = 1; i <= 5; i++)
                db.Tasks.Add(new ClubTask
                {
                    Id = i, ClubId = 1, Title = $"Task {i}",
                    AssignedTo = "u1", Status = ClubTaskStatus.Done, Progress = 100,
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = now.AddMinutes(-1),
                    Deadline = now.AddDays(1)
                });
            db.Contributions.Add(new Contribution
            {
                Id = 1, UserId = "u1", ClubId = 1,
                Points = 100, ActivityType = ActivityType.Task,
                RecordedAt = now
            });
        });

        var result = await svc.GetMyResultAsync(1, null, null, "u1", isSuperAdmin: true);

        // 100*35 + 100*25 + 100*15 + 100*15 + 100*10 = 10000 → weighted 100
        Assert.Equal(100, result.TotalScore);
        Assert.Equal("Xuất sắc", result.Grade);
    }

    [Fact]
    public async Task GetMyResultAsync_WithHalfTasksDone_ScoreIsExactlyAcceptedGrade()
    {
        var (svc, _) = await SetupAsync(db =>
        {
            var now = DateTimeOffset.UtcNow;
            // 4 done on time (progress=100), 4 not done (progress=0)
            for (var i = 1; i <= 4; i++)
                db.Tasks.Add(new ClubTask
                {
                    Id = i, ClubId = 1, Title = $"Done {i}",
                    AssignedTo = "u1", Status = ClubTaskStatus.Done, Progress = 100,
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = now.AddMinutes(-1),
                    Deadline = now.AddDays(1)
                });
            for (var i = 5; i <= 8; i++)
                db.Tasks.Add(new ClubTask
                {
                    Id = i, ClubId = 1, Title = $"Todo {i}",
                    AssignedTo = "u1", Status = ClubTaskStatus.Todo, Progress = 0,
                    CreatedAt = DateTime.UtcNow
                });
        });

        var result = await svc.GetMyResultAsync(1, null, null, "u1", isSuperAdmin: true);

        // TaskCompletion:   4/8=50  → 50*0.35 = 17.5
        // OnTimeCompletion: 4/4=100 → 100*0.25 = 25
        // AvgProgress:      50      → 50*0.15  = 7.5
        // ContribPoints:    0       → 0*0.15   = 0
        // Workload:         8/8=100 → 100*0.10 = 10
        // Total = 60 → "Đạt"
        Assert.Equal(60, result.TotalScore);
        Assert.Equal("Đạt", result.Grade);
    }

    [Fact]
    public async Task GetMyResultAsync_WithSuperAdminAndNoMembership_ThrowsKeyNotFound()
    {
        var db = Fx.CreateDbContext();
        var perm = new Mock<IClubPermissionService>();
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        db.Users.Add(new ApplicationUser
        {
            Id = "u1", UserName = "u1", Email = "u1@test.com",
            NormalizedEmail = "U1@TEST.COM", NormalizedUserName = "U1", SecurityStamp = "x1"
        });
        await db.SaveChangesAsync();

        var svc = new KpiService(db, perm.Object);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            svc.GetMyResultAsync(1, null, null, "u1", isSuperAdmin: true));
    }

    [Fact]
    public async Task GetResultsAsync_RankOrdering_HigherScoreRanksFirst()
    {
        var db = Fx.CreateDbContext();
        var perm = new Mock<IClubPermissionService>();
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        db.Users.Add(new ApplicationUser { Id = "u1", UserName = "u1", Email = "u1@test.com", NormalizedEmail = "U1@TEST.COM", NormalizedUserName = "U1", SecurityStamp = "x1" });
        db.Users.Add(new ApplicationUser { Id = "u2", UserName = "u2", Email = "u2@test.com", NormalizedEmail = "U2@TEST.COM", NormalizedUserName = "U2", SecurityStamp = "x2" });
        db.ClubMemberships.Add(new ClubMembership { Id = 1, UserId = "u1", ClubId = 1, Status = MembershipStatus.Active, JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow), ClubRole = ClubRole.MEMBER });
        db.ClubMemberships.Add(new ClubMembership { Id = 2, UserId = "u2", ClubId = 1, Status = MembershipStatus.Active, JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow), ClubRole = ClubRole.MEMBER });

        var now = DateTimeOffset.UtcNow;
        for (var i = 1; i <= 5; i++)
            db.Tasks.Add(new ClubTask
            {
                Id = i, ClubId = 1, Title = $"Task {i}",
                AssignedTo = "u1", Status = ClubTaskStatus.Done, Progress = 100,
                CreatedAt = DateTime.UtcNow, CompletedAt = now.AddMinutes(-1), Deadline = now.AddDays(1)
            });
        db.Contributions.Add(new Contribution { Id = 1, UserId = "u1", ClubId = 1, Points = 100, ActivityType = ActivityType.Task, RecordedAt = now });
        await db.SaveChangesAsync();

        var svc = new KpiService(db, perm.Object);
        var results = await svc.GetResultsAsync(1, null, null, null, "u1", isSuperAdmin: true);

        Assert.Equal(2, results.TotalMembers);
        Assert.Equal("u1", results.Members[0].UserId);
        Assert.Equal(1, results.Members[0].Rank);
        Assert.Equal("u2", results.Members[1].UserId);
        Assert.Equal(2, results.Members[1].Rank);
    }

    [Fact]
    public async Task GetMyResultAsync_WhenAnotherMemberHasMoreTasks_WorkloadNotAlways100AndRankReflectsClub()
    {
        var db = Fx.CreateDbContext();
        var perm = new Mock<IClubPermissionService>();
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        db.Users.Add(new ApplicationUser { Id = "u1", UserName = "u1", Email = "u1@test.com", NormalizedEmail = "U1@TEST.COM", NormalizedUserName = "U1", SecurityStamp = "x1" });
        db.Users.Add(new ApplicationUser { Id = "u2", UserName = "u2", Email = "u2@test.com", NormalizedEmail = "U2@TEST.COM", NormalizedUserName = "U2", SecurityStamp = "x2" });
        db.ClubMemberships.Add(new ClubMembership { Id = 1, UserId = "u1", ClubId = 1, Status = MembershipStatus.Active, JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow), ClubRole = ClubRole.MEMBER });
        db.ClubMemberships.Add(new ClubMembership { Id = 2, UserId = "u2", ClubId = 1, Status = MembershipStatus.Active, JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow), ClubRole = ClubRole.MEMBER });

        var now = DateTimeOffset.UtcNow;
        for (var i = 1; i <= 2; i++)
            db.Tasks.Add(new ClubTask
            {
                Id = i, ClubId = 1, Title = $"Task u1 {i}",
                AssignedTo = "u1", Status = ClubTaskStatus.Done, Progress = 100,
                CreatedAt = DateTime.UtcNow, CompletedAt = now.AddMinutes(-1), Deadline = now.AddDays(1)
            });
        for (var i = 3; i <= 8; i++)
            db.Tasks.Add(new ClubTask
            {
                Id = i, ClubId = 1, Title = $"Task u2 {i}",
                AssignedTo = "u2", Status = ClubTaskStatus.Done, Progress = 100,
                CreatedAt = DateTime.UtcNow, CompletedAt = now.AddMinutes(-1), Deadline = now.AddDays(1)
            });
        await db.SaveChangesAsync();

        var svc = new KpiService(db, perm.Object);
        var u1 = await svc.GetMyResultAsync(1, null, null, "u1", isSuperAdmin: true);
        var clubResults = await svc.GetResultsAsync(1, null, null, null, "u1", isSuperAdmin: true);

        var workloadMetric = u1.Metrics.First(m => m.MetricKey == KpiMetricKey.Workload);
        Assert.True(workloadMetric.RawScore < 100);
        Assert.Equal(2, u1.Rank);
        Assert.Equal("u2", clubResults.Members[0].UserId);
    }

    [Fact]
    public async Task UpdateCriteriaAsync_WithEmptyList_ThrowsInvalidOperation()
    {
        var (svc, _) = await SetupAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.UpdateCriteriaAsync(1, [], "u1", isSuperAdmin: true));
    }

    [Fact]
    public async Task UpdateGradesAsync_WithoutFallbackGrade_ThrowsInvalidOperation()
    {
        var (svc, _) = await SetupAsync();
        var dto = new UpdateKpiGradesDto
        {
            Grades =
            [
                new UpdateKpiGradeDto { Label = "Xuất sắc", MinScore = 90 },
                new UpdateKpiGradeDto { Label = "Tốt", MinScore = 75 },
                // Intentionally missing MinScore = 0 fallback
            ]
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.UpdateGradesAsync(1, dto, "u1", isSuperAdmin: true));

        Assert.Contains("MinScore = 0", ex.Message);
    }
}
