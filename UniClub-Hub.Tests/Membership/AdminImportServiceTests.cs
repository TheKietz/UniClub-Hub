using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System.Text;
using UniClub_Hub.Membership.DTOs.Membership;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Email;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class AdminImportServiceTests : DbTestBase
{
    public AdminImportServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    private static IFormFile CreateCsvFile(string csv, string fileName = "users.csv")
    {
        var bytes = Encoding.UTF8.GetBytes(csv);
        var file = new Mock<IFormFile>();
        file.Setup(f => f.FileName).Returns(fileName);
        file.Setup(f => f.Length).Returns(bytes.Length);
        file.Setup(f => f.OpenReadStream()).Returns(() => new MemoryStream(bytes));
        return file.Object;
    }

    private static (AdminImportService service, Mock<UserManager<ApplicationUser>> userManager) CreateService(
        Shared.Data.UniClubDbContext db)
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        var userManager = new Mock<UserManager<ApplicationUser>>(
            store.Object,
            Options.Create(new IdentityOptions()),
            new PasswordHasher<ApplicationUser>(),
            Array.Empty<IUserValidator<ApplicationUser>>(),
            Array.Empty<IPasswordValidator<ApplicationUser>>(),
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            Mock.Of<IServiceProvider>(),
            Mock.Of<ILogger<UserManager<ApplicationUser>>>());

        userManager.Setup(m => m.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((ApplicationUser?)null);
        userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);
        userManager.Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), "USER"))
            .ReturnsAsync(IdentityResult.Success);
        userManager.Setup(m => m.GeneratePasswordResetTokenAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync("reset-token");

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["AppUrl"] = "https://localhost:54610" })
            .Build();

        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync("system.logo_url")).ReturnsAsync((string?)null);

        var service = new AdminImportService(
            db,
            userManager.Object,
            Mock.Of<IEmailService>(),
            config,
            settings.Object);

        return (service, userManager);
    }

    [Fact]
    public async Task PreviewUsersAsync_WithNullFile_ThrowsArgumentException()
    {
        await using var db = Fx.CreateDbContext();
        var (svc, _) = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => svc.PreviewUsersAsync(null!));
    }

    [Fact]
    public async Task PreviewUsersAsync_WithDuplicateStudentIdInFile_MarksSecondInvalid()
    {
        await using var db = Fx.CreateDbContext();
        var (svc, _) = CreateService(db);

        var file = CreateCsvFile(
            "Email,HoTen,MaSoSinhVien,Nganh\n" +
            "a@uef.edu.vn,A,2151000001,CNTT\n" +
            "b@uef.edu.vn,B,2151000001,CNTT\n");

        var preview = await svc.PreviewUsersAsync(file);

        Assert.Single(preview.ValidRows);
        Assert.Single(preview.InvalidRows);
        Assert.Contains("MSSV", preview.InvalidRows[0].Error!);
    }

    [Fact]
    public async Task PreviewUsersAsync_WithExistingStudentId_MarksInvalid()
    {
        await using var db = Fx.CreateDbContext();
        db.Users.Add(PagedServiceTestHelpers.User(1, "Existing", "existing@uef.edu.vn", "2151000001"));
        await db.SaveChangesAsync();

        var (svc, _) = CreateService(db);

        var file = CreateCsvFile(
            "Email,HoTen,MaSoSinhVien,Nganh\nnew@uef.edu.vn,New,2151000001,CNTT\n");

        var preview = await svc.PreviewUsersAsync(file);

        Assert.Empty(preview.ValidRows);
        Assert.Single(preview.InvalidRows);
        Assert.Contains("MSSV", preview.InvalidRows[0].Error!);
    }

    [Fact]
    public async Task ConfirmUsersAsync_WithDuplicateStudentIdInRequest_SkipsSecond()
    {
        await using var db = Fx.CreateDbContext();
        var (svc, userManager) = CreateService(db);

        var result = await svc.ConfirmUsersAsync(new ImportUserConfirmRequest
        {
            Rows =
            [
                new ImportUserRowResult { Email = "a@uef.edu.vn", FullName = "A", StudentId = "2151000001" },
                new ImportUserRowResult { Email = "b@uef.edu.vn", FullName = "B", StudentId = "2151000001" },
            ],
        });

        Assert.Equal(1, result.Imported);
        Assert.Equal(1, result.Skipped);
        userManager.Verify(m => m.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ConfirmUsersAsync_GeneratesUniquePasswordsPerUser()
    {
        await using var db = Fx.CreateDbContext();
        var passwords = new List<string>();
        var store = new Mock<IUserStore<ApplicationUser>>();
        var userManager = new Mock<UserManager<ApplicationUser>>(
            store.Object,
            Options.Create(new IdentityOptions()),
            new PasswordHasher<ApplicationUser>(),
            Array.Empty<IUserValidator<ApplicationUser>>(),
            Array.Empty<IPasswordValidator<ApplicationUser>>(),
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            Mock.Of<IServiceProvider>(),
            Mock.Of<ILogger<UserManager<ApplicationUser>>>());

        userManager.Setup(m => m.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((ApplicationUser?)null);
        userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
            .Callback<ApplicationUser, string>((_, pwd) => passwords.Add(pwd))
            .ReturnsAsync(IdentityResult.Success);
        userManager.Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), "USER"))
            .ReturnsAsync(IdentityResult.Success);
        userManager.Setup(m => m.GeneratePasswordResetTokenAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync("reset-token");

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["AppUrl"] = "https://localhost:54610" })
            .Build();
        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync("system.logo_url")).ReturnsAsync((string?)null);

        var svc = new AdminImportService(
            db,
            userManager.Object,
            Mock.Of<IEmailService>(),
            config,
            settings.Object);

        await svc.ConfirmUsersAsync(new ImportUserConfirmRequest
        {
            Rows =
            [
                new ImportUserRowResult { Email = "a@uef.edu.vn", FullName = "A" },
                new ImportUserRowResult { Email = "b@uef.edu.vn", FullName = "B" },
            ],
        });

        Assert.Equal(2, passwords.Count);
        Assert.NotEqual(passwords[0], passwords[1]);
        Assert.DoesNotContain("UniClub@2026", passwords);
    }

    [Fact]
    public async Task ConfirmUsersAsync_SetsEmailConfirmedFalse()
    {
        await using var db = Fx.CreateDbContext();
        ApplicationUser? created = null;
        var store = new Mock<IUserStore<ApplicationUser>>();
        var userManager = new Mock<UserManager<ApplicationUser>>(
            store.Object,
            Options.Create(new IdentityOptions()),
            new PasswordHasher<ApplicationUser>(),
            Array.Empty<IUserValidator<ApplicationUser>>(),
            Array.Empty<IPasswordValidator<ApplicationUser>>(),
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            Mock.Of<IServiceProvider>(),
            Mock.Of<ILogger<UserManager<ApplicationUser>>>());

        userManager.Setup(m => m.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((ApplicationUser?)null);
        userManager.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
            .Callback<ApplicationUser, string>((u, _) => created = u)
            .ReturnsAsync(IdentityResult.Success);
        userManager.Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), "USER"))
            .ReturnsAsync(IdentityResult.Success);
        userManager.Setup(m => m.GeneratePasswordResetTokenAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync("reset-token");

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["AppUrl"] = "https://localhost:54610" })
            .Build();
        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync("system.logo_url")).ReturnsAsync((string?)null);

        var svc = new AdminImportService(
            db,
            userManager.Object,
            Mock.Of<IEmailService>(),
            config,
            settings.Object);

        await svc.ConfirmUsersAsync(new ImportUserConfirmRequest
        {
            Rows = [new ImportUserRowResult { Email = "a@uef.edu.vn", FullName = "A" }],
        });

        Assert.NotNull(created);
        Assert.False(created!.EmailConfirmed);
    }
}
