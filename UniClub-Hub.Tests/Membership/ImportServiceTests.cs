using Microsoft.AspNetCore.Http;
using Moq;
using System.Text;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ImportServiceTests : DbTestBase
{
    public ImportServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    private static ImportService CreateService(
        Shared.Data.UniClubDbContext db,
        Mock<ISystemSettingService>? settings = null)
    {
        var settingsMock = settings ?? new Mock<ISystemSettingService>();
        if (settings == null)
            settingsMock.Setup(s => s.GetValueAsync("club.max_members")).ReturnsAsync((string?)null);

        var dispatch = new Mock<INotificationDispatchService>();
        dispatch.Setup(d => d.FireAsync(
                It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, string>>()))
            .Returns(Task.CompletedTask);

        var permissions = PagedServiceTestHelpers.CreatePermissivePermissionMock();
        var membership = new ClubMembershipService(
            db, dispatch.Object, settingsMock.Object, permissions.Object);

        return new ImportService(db, permissions.Object, membership);
    }

    private static IFormFile CreateCsvFile(string csv, string fileName = "import.csv")
    {
        var bytes = Encoding.UTF8.GetBytes(csv);
        var stream = new MemoryStream(bytes);
        var file = new Mock<IFormFile>();
        file.Setup(f => f.FileName).Returns(fileName);
        file.Setup(f => f.Length).Returns(bytes.Length);
        file.Setup(f => f.OpenReadStream()).Returns(() => new MemoryStream(bytes));
        return file.Object;
    }

    private static void SeedClubWithUsers(Shared.Data.UniClubDbContext db, params (string Id, string Email)[] users)
    {
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test CLB", "TEST"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Truyền thông"));

        foreach (var (id, email) in users)
        {
            db.Users.Add(new ApplicationUser
            {
                Id = id,
                UserName = email,
                NormalizedUserName = email.ToUpperInvariant(),
                Email = email,
                NormalizedEmail = email.ToUpperInvariant(),
                FullName = $"User {id}",
                SecurityStamp = Guid.NewGuid().ToString(),
            });
        }

        db.SaveChanges();
    }

    [Fact]
    public async Task PreviewAsync_WithNullFile_ThrowsArgumentException()
    {
        await using var db = Fx.CreateDbContext();
        var svc = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.PreviewAsync(1, null!, "admin", isSuperAdmin: true));
    }

    [Fact]
    public async Task PreviewAsync_WithDuplicateEmailInFile_MarksSecondInvalid()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithUsers(db, ("u1", "a@uef.edu.vn"));
        var svc = CreateService(db);

        var file = CreateCsvFile(
            "Email,ClubRole,Ban\na@uef.edu.vn,MEMBER,\na@uef.edu.vn,MEMBER,\n");

        var preview = await svc.PreviewAsync(1, file, "admin", isSuperAdmin: true);

        Assert.Single(preview.ValidRows);
        Assert.Single(preview.InvalidRows);
        Assert.Contains("trùng", preview.InvalidRows[0].Error!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task PreviewAsync_WithClubAdminRole_MarksInvalid()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithUsers(db, ("u1", "a@uef.edu.vn"));
        var svc = CreateService(db);

        var file = CreateCsvFile("Email,ClubRole,Ban\na@uef.edu.vn,CLUB_ADMIN,\n");

        var preview = await svc.PreviewAsync(1, file, "admin", isSuperAdmin: true);

        Assert.Empty(preview.ValidRows);
        Assert.Single(preview.InvalidRows);
        Assert.Contains("MEMBER", preview.InvalidRows[0].Error!);
    }

    [Fact]
    public async Task ConfirmAsync_WithClubAdminRole_SkipsAndDoesNotImport()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithUsers(db, ("u1", "a@uef.edu.vn"));
        var svc = CreateService(db);

        var result = await svc.ConfirmAsync(1, new ImportConfirmRequest
        {
            Rows =
            [
                new ImportRowRequest { Email = "a@uef.edu.vn", ClubRole = "CLUB_ADMIN" },
            ],
        }, "admin", isSuperAdmin: true);

        Assert.Equal(0, result.Imported);
        Assert.Equal(1, result.Skipped);
        Assert.Empty(db.ClubMemberships);
    }

    [Fact]
    public async Task ConfirmAsync_WithDuplicateEmailInRequest_ImportsOnlyOnce()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithUsers(db, ("u1", "a@uef.edu.vn"), ("u2", "b@uef.edu.vn"));
        var svc = CreateService(db);

        var result = await svc.ConfirmAsync(1, new ImportConfirmRequest
        {
            Rows =
            [
                new ImportRowRequest { Email = "a@uef.edu.vn", ClubRole = "MEMBER" },
                new ImportRowRequest { Email = "a@uef.edu.vn", ClubRole = "MEMBER" },
                new ImportRowRequest { Email = "b@uef.edu.vn", ClubRole = "MEMBER" },
            ],
        }, "admin", isSuperAdmin: true);

        Assert.Equal(2, result.Imported);
        Assert.Equal(1, result.Skipped);
        Assert.Equal(2, db.ClubMemberships.Count());
    }

    [Fact]
    public async Task ConfirmAsync_WithInvalidDepartment_SkipsRow()
    {
        await using var db = Fx.CreateDbContext();
        SeedClubWithUsers(db, ("u1", "a@uef.edu.vn"));
        var svc = CreateService(db);

        var result = await svc.ConfirmAsync(1, new ImportConfirmRequest
        {
            Rows =
            [
                new ImportRowRequest
                {
                    Email = "a@uef.edu.vn",
                    ClubRole = "MEMBER",
                    DepartmentName = "Ban không tồn tại",
                },
            ],
        }, "admin", isSuperAdmin: true);

        Assert.Equal(0, result.Imported);
        Assert.Equal(1, result.Skipped);
        Assert.Empty(db.ClubMemberships);
    }

    [Fact]
    public async Task ConfirmAsync_AtMaxCapacity_StopsAdding()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test CLB", "TEST"));
        db.Users.Add(PagedServiceTestHelpers.User(1, "Existing", "existing@uef.edu.vn", "S001"));
        db.Users.Add(PagedServiceTestHelpers.User(2, "New 1", "new1@uef.edu.vn", "S002"));
        db.Users.Add(PagedServiceTestHelpers.User(3, "New 2", "new2@uef.edu.vn", "S003"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u1"));
        db.SaveChanges();

        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync("club.max_members")).ReturnsAsync("2");
        var svc = CreateService(db, settings);

        var result = await svc.ConfirmAsync(1, new ImportConfirmRequest
        {
            Rows =
            [
                new ImportRowRequest { Email = "new1@uef.edu.vn", ClubRole = "MEMBER" },
                new ImportRowRequest { Email = "new2@uef.edu.vn", ClubRole = "MEMBER" },
            ],
        }, "admin", isSuperAdmin: true);

        Assert.Equal(1, result.Imported);
        Assert.Contains(result.Errors, e => e.Contains("giới hạn"));
        Assert.Equal(2, db.ClubMemberships.Count(m => m.Status == MembershipStatus.Active));
    }
}
