using Microsoft.EntityFrameworkCore;
using Moq;
using UniClub_Hub.Membership.DTOs.Application;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.DTOs.Pipeline;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ApplicationServiceWorkflowTests : DbTestBase
{
    public ApplicationServiceWorkflowTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task SubmitAsync_WithValidUser_CreatesPendingApplication()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithPipeline(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Applicant", "app@uef.edu.vn", "S001"));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateApplicationService(db);

        var result = await service.SubmitAsync(1, "u1", new SubmitApplicationDto());

        Assert.Equal(ApplicationStatus.Pending, result.Status);
        Assert.Single(await db.Applications.Where(a => a.UserId == "u1" && a.ClubId == 1).ToListAsync());
    }

    [Fact]
    public async Task SubmitAsync_WhenAlreadyMember_ThrowsInvalidOperation()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithPipeline(db);
        db.Users.Add(PagedServiceTestHelpers.User(1));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u1"));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateApplicationService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SubmitAsync(1, "u1", new SubmitApplicationDto()));
    }

    [Fact]
    public async Task ReviewAsync_WithAccepted_CreatesProbationMembership()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithPipeline(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Applicant", "app@uef.edu.vn", "S001"));
        db.Applications.Add(PagedServiceTestHelpers.Application(1, "u1", status: ApplicationStatus.Reviewing, stageId: 2));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateApplicationService(db);

        var result = await service.ReviewAsync(
            1, 1,
            new ReviewApplicationDto { Status = ApplicationStatus.Accepted, ReviewNote = "OK" },
            "reviewer",
            isSuperAdmin: true);

        Assert.Equal(ApplicationStatus.Accepted, result.Status);
        var membership = await db.ClubMemberships
            .FirstOrDefaultAsync(m => m.ClubId == 1 && m.UserId == "u1");
        Assert.NotNull(membership);
        Assert.Equal(MembershipStatus.Probation, membership!.Status);
        Assert.Equal(ClubRole.MEMBER, membership.ClubRole);
    }

    [Fact]
    public async Task ReviewAsync_WithRejected_DoesNotCreateMembership()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithPipeline(db);
        db.Users.Add(PagedServiceTestHelpers.User(1));
        db.Applications.Add(PagedServiceTestHelpers.Application(1, "u1", status: ApplicationStatus.Pending));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateApplicationService(db);

        var result = await service.ReviewAsync(
            1, 1,
            new ReviewApplicationDto { Status = ApplicationStatus.Rejected, ReviewNote = "No fit" },
            "reviewer",
            isSuperAdmin: true);

        Assert.Equal(ApplicationStatus.Rejected, result.Status);
        Assert.False(await db.ClubMemberships.AnyAsync(m => m.ClubId == 1 && m.UserId == "u1"));
    }

    [Fact]
    public async Task AdvanceStageAsync_FromPending_SetsFirstPipelineStage()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithPipeline(db);
        db.Users.Add(PagedServiceTestHelpers.User(1));
        db.Applications.Add(PagedServiceTestHelpers.Application(1, "u1", status: ApplicationStatus.Pending));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateApplicationService(db);

        var result = await service.AdvanceStageAsync(
            1, 1,
            new AdvanceApplicationRequest { ReviewNote = "Passed CV" },
            "reviewer",
            isSuperAdmin: true);

        Assert.Equal(ApplicationStatus.Reviewing, result.Status);
        Assert.Equal("Screening", result.CurrentStageName);
        Assert.Equal(1, db.Applications.Find(1)!.CurrentStageId);
    }

    [Fact]
    public async Task ReviewAsync_WhenClubAtMemberLimit_ThrowsInvalidOperation()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithPipeline(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Applicant", "app@uef.edu.vn", "S001"));
        db.Users.Add(PagedServiceTestHelpers.User(2, "Existing", "existing@uef.edu.vn", "S002"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u2"));
        db.Applications.Add(PagedServiceTestHelpers.Application(1, "u1", status: ApplicationStatus.Reviewing, stageId: 2));
        await db.SaveChangesAsync();

        var dispatch = new Mock<INotificationDispatchService>();
        dispatch.Setup(d => d.FireAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, string>>()))
            .Returns(Task.CompletedTask);

        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync("club.max_members")).ReturnsAsync((string?)"1");

        var membershipService = new ClubMembershipService(
            db, dispatch.Object, settings.Object, Mock.Of<IClubPermissionService>());

        var service = PagedServiceTestHelpers.CreateApplicationService(
            db, PagedServiceTestHelpers.CreatePermissivePermissionMock(), membershipService);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ReviewAsync(
                1, 1,
                new ReviewApplicationDto { Status = ApplicationStatus.Accepted, ReviewNote = "OK" },
                "reviewer",
                isSuperAdmin: true));
    }

    private static void SeedClubWithPipeline(UniClub_Hub.Shared.Data.UniClubDbContext db)
    {
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
        db.ClubPipelineStages.AddRange(
            new ClubPipelineStage { Id = 1, ClubId = 1, Name = "Screening", StageOrder = 1 },
            new ClubPipelineStage { Id = 2, ClubId = 1, Name = "Interview", StageOrder = 2 });
    }
}
