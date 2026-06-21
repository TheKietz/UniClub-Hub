using System.Text;
using Moq;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ExportServicePagedTests : DbTestBase
{
    public ExportServicePagedTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task ExportMembersAsync_WithFilterAndSmallPageSize_ExportsAllFilteredRows()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
        for (var i = 1; i <= 4; i++)
        {
            db.Users.Add(PagedServiceTestHelpers.User(i, $"Member {i}", $"member{i}@uef.edu.vn", $"S{i:000}"));
            db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
                i,
                $"u{i}",
                status: i == 4 ? MembershipStatus.Resigned : MembershipStatus.Active));
        }
        await db.SaveChangesAsync();

        var permissions = new Mock<IClubPermissionService>();
        permissions.Setup(p => p.EnsureHasPermissionAsync(
            It.IsAny<int>(),
            It.IsAny<string>(),
            It.IsAny<bool>(),
            It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        var service = new ExportService(db, permissions.Object);

        var (content, contentType, fileName) = await service.ExportMembersAsync(
            1,
            "csv",
            "admin",
            isSuperAdmin: true,
            new MemberListQuery { Status = "Active", Page = 1, PageSize = 1 });
        var csv = Encoding.UTF8.GetString(content);

        Assert.Equal("text/csv", contentType);
        Assert.Equal("members_TEST.csv", fileName);
        Assert.Contains("Member 1", csv);
        Assert.Contains("Member 2", csv);
        Assert.Contains("Member 3", csv);
        Assert.DoesNotContain("Member 4", csv);
    }
}
