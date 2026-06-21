using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class SystemSettingServiceTests : DbTestBase
{
    public SystemSettingServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task IsRegistrationOpen_WhenSettingMissing_ReturnsTrue()
    {
        await using var db = Fx.CreateDbContext();
        var service = new SystemSettingService(db);

        Assert.True(await service.IsRegistrationOpenAsync());
    }

    [Fact]
    public async Task IsRegistrationOpen_WhenValueFalse_ReturnsFalse()
    {
        await using var db = Fx.CreateDbContext();
        SeedSetting(db, "auth.registration_open", "false");
        await db.SaveChangesAsync();

        var service = new SystemSettingService(db);
        Assert.False(await service.IsRegistrationOpenAsync());
    }

    [Fact]
    public async Task GetAllowedDomains_WhenEmpty_ReturnsEmptyList()
    {
        await using var db = Fx.CreateDbContext();
        var service = new SystemSettingService(db);

        var domains = await service.GetAllowedDomainsAsync();
        Assert.Empty(domains);
    }

    [Fact]
    public async Task GetAllowedDomains_WithCommaSeparated_TrimsAndLowercases()
    {
        await using var db = Fx.CreateDbContext();
        SeedSetting(db, "auth.allowed_domains", "UEF.edu.vn, Gmail.com ");
        await db.SaveChangesAsync();

        var service = new SystemSettingService(db);
        var domains = await service.GetAllowedDomainsAsync();

        Assert.Equal(2, domains.Count);
        Assert.Contains("uef.edu.vn", domains);
        Assert.Contains("gmail.com", domains);
    }

    private static void SeedSetting(UniClubDbContext db, string key, string value) =>
        db.SystemSettings.Add(new SystemSetting
        {
            Key = key,
            Value = value,
            Label = key,
            Category = "auth",
            InputType = "text",
        });
}
