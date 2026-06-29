using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ApplicationServicePagedTests : DbTestBase
{
    public ApplicationServicePagedTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task GetAllByClubPageAsync_WithSearchAndEmptySearch_ReturnsExpectedApplications()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubAndStages(db);
        db.Users.AddRange(
            PagedServiceTestHelpers.User(1, "Nguyen An", "an@uef.edu.vn", "S001"),
            PagedServiceTestHelpers.User(2, "Binh Tran", "binh@uef.edu.vn", "S002"),
            PagedServiceTestHelpers.User(3, "Chi Le", "chi@uef.edu.vn", "AN003"));
        db.Applications.AddRange(
            PagedServiceTestHelpers.Application(1, "u1", stageId: 1),
            PagedServiceTestHelpers.Application(2, "u2", stageId: 2),
            PagedServiceTestHelpers.Application(3, "u3", stageId: 1));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateApplicationService(db);

        var search = await service.GetAllByClubPageAsync(1, new ApplicationListQuery { Search = "interview", Page = 1, PageSize = 20 });
        var all = await service.GetAllByClubPageAsync(1, new ApplicationListQuery { Search = "", Page = 1, PageSize = 20 });

        Assert.Single(search.Items);
        Assert.Equal("u2", search.Items[0].UserId);
        Assert.Equal(3, all.TotalCount);
    }

    [Fact]
    public async Task GetAllByClubPageAsync_WithStatusStageDateSortAndDefault_ReturnsExpectedApplications()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubAndStages(db);
        db.Users.AddRange(PagedServiceTestHelpers.User(1), PagedServiceTestHelpers.User(2), PagedServiceTestHelpers.User(3));
        db.Applications.AddRange(
            PagedServiceTestHelpers.Application(1, "u1", status: ApplicationStatus.Pending, stageId: 1, appliedAt: new DateTime(2026, 3, 1, 9, 0, 0, DateTimeKind.Utc)),
            PagedServiceTestHelpers.Application(2, "u2", status: ApplicationStatus.Reviewing, stageId: 2, appliedAt: new DateTime(2026, 3, 2, 9, 0, 0, DateTimeKind.Utc)),
            PagedServiceTestHelpers.Application(3, "u3", status: ApplicationStatus.Rejected, stageId: 1, appliedAt: new DateTime(2026, 3, 3, 9, 0, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateApplicationService(db);

        var reviewing = await service.GetAllByClubPageAsync(1, new ApplicationListQuery { Status = "Reviewing", Page = 1, PageSize = 20 });
        var stageOne = await service.GetAllByClubPageAsync(1, new ApplicationListQuery { StageId = 1, Page = 1, PageSize = 20 });
        var dateRange = await service.GetAllByClubPageAsync(1, new ApplicationListQuery
        {
            DateFrom = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc),
            DateTo = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc),
            Page = 1,
            PageSize = 20
        });
        var oldest = await service.GetAllByClubPageAsync(1, new ApplicationListQuery { SortBy = "appliedAt", SortDir = "asc", Page = 1, PageSize = 20 });
        var defaultSort = await service.GetAllByClubPageAsync(1, new ApplicationListQuery { SortBy = "not_real", SortDir = "desc", Page = 1, PageSize = 20 });

        Assert.Single(reviewing.Items);
        Assert.Equal("u2", reviewing.Items[0].UserId);
        Assert.Equal(new[] { "u3", "u1" }, stageOne.Items.Select(a => a.UserId).ToArray());
        Assert.Single(dateRange.Items);
        Assert.Equal("u2", dateRange.Items[0].UserId);
        Assert.Equal(new[] { "u1", "u2", "u3" }, oldest.Items.Select(a => a.UserId).ToArray());
        Assert.Equal(new[] { "u3", "u2", "u1" }, defaultSort.Items.Select(a => a.UserId).ToArray());
    }

    [Fact]
    public async Task GetAllByClubPageAsync_WithDuplicateSortKeyAcrossPages_ReturnsStableNonOverlappingPages()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubAndStages(db);
        var sameAppliedAt = new DateTime(2026, 4, 1, 9, 0, 0, DateTimeKind.Utc);
        for (var i = 1; i <= 22; i++)
        {
            db.Users.Add(PagedServiceTestHelpers.User(i, $"Applicant {i:00}", $"app{i:00}@uef.edu.vn", $"S{i:000}"));
            db.Applications.Add(PagedServiceTestHelpers.Application(i, $"u{i}", stageId: 1, appliedAt: sameAppliedAt));
        }
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateApplicationService(db);

        var page1 = await service.GetAllByClubPageAsync(1, new ApplicationListQuery { SortBy = "appliedAt", Page = 1, PageSize = 20 });
        var page2 = await service.GetAllByClubPageAsync(1, new ApplicationListQuery { SortBy = "appliedAt", Page = 2, PageSize = 20 });
        var clamped = await service.GetAllByClubPageAsync(1, new ApplicationListQuery { Page = 0, PageSize = 1000 });
        var fullList = await service.GetAllByClubAsync(1);

        Assert.Empty(page1.Items.Select(a => a.Id).Intersect(page2.Items.Select(a => a.Id)));
        Assert.Equal(22, page1.Items.Concat(page2.Items).Select(a => a.Id).Distinct().Count());
        Assert.Equal(1, clamped.Page);
        Assert.Equal(100, clamped.PageSize);
        Assert.Equal(22, fullList.Count());
    }

    private static void SeedClubAndStages(UniClub_Hub.Shared.Data.UniClubDbContext db)
    {
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
        db.ClubPipelineStages.AddRange(
            new ClubPipelineStage { Id = 1, ClubId = 1, Name = "Screening", StageOrder = 1 },
            new ClubPipelineStage { Id = 2, ClubId = 1, Name = "Interview", StageOrder = 2 });
    }
}
