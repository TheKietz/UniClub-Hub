using Microsoft.EntityFrameworkCore;
using Moq;
using UniClub_Hub.Membership.DTOs.Department;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class DepartmentServiceWorkflowTests : DbTestBase
{
    public DepartmentServiceWorkflowTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task UpdateAsync_AsSuperAdmin_UpdatesDepartment()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithDepartment(db);
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.UpdateAsync(
            1, 1,
            new UpdateDepartmentDto { Name = "Ban Truyen thong", Description = "Media team" },
            "admin",
            isSuperAdmin: true);

        Assert.Equal("Ban Truyen thong", result.Name);
        Assert.Equal("Media team", db.Departments.Find(1)!.Description);
    }

    [Fact]
    public async Task DeleteAsync_AsSuperAdmin_RemovesDepartmentAndDemotesLead()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithDepartment(db);
        db.Users.Add(PagedServiceTestHelpers.User(2, "Dept Lead", "lead@uef.edu.vn", "S002"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            2, "u2", role: ClubRole.DEPT_LEAD, departmentId: 1));
        await db.SaveChangesAsync();

        var service = CreateService(db);

        await service.DeleteAsync(1, 1, "admin", isSuperAdmin: true);

        Assert.False(await db.Departments.AnyAsync(d => d.Id == 1));
        var membership = await db.ClubMemberships.FindAsync(2);
        Assert.Null(membership!.DepartmentId);
        Assert.Equal(ClubRole.MEMBER, membership.ClubRole);
    }

    private static DepartmentService CreateService(UniClub_Hub.Shared.Data.UniClubDbContext db)
    {
        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync(It.IsAny<string>())).ReturnsAsync((string?)null);
        settings.Setup(s => s.GetNotificationTextAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync((string?)null);

        return new DepartmentService(
            db,
            Mock.Of<INotificationService>(),
            settings.Object,
            new ClubPermissionService(db));
    }

    private static void SeedClubWithDepartment(UniClub_Hub.Shared.Data.UniClubDbContext db)
    {
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Su kien"));
    }
}
