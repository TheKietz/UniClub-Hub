using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Server.Data;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Server.BackgroundServices;

/// <summary>
/// Runs EF migrations (and minimal production seed) after Kestrel starts so Render/Vercel
/// port scans pass before a long first-time migration finishes.
/// </summary>
public sealed class DatabaseMigrationHostedService(
    IServiceScopeFactory scopeFactory,
    IHostEnvironment env,
    ILogger<DatabaseMigrationHostedService> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (env.IsEnvironment("Testing"))
            return;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<UniClubDbContext>();

        Exception? lastError = null;

        for (var attempt = 1; attempt <= 12; attempt++)
        {
            try
            {
                await db.Database.MigrateAsync(cancellationToken);
                logger.LogInformation("Database migration completed.");
                lastError = null;
                break;
            }
            catch (Exception ex)
            {
                lastError = ex;
                if (attempt < 12 && !cancellationToken.IsCancellationRequested)
                {
                    logger.LogWarning(ex, "Migration attempt {Attempt}/12 failed; retrying in 5s...", attempt);
                    await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
                }
            }
        }

        if (lastError is not null)
        {
            logger.LogError(
                lastError,
                "Database migration failed after all retries. API will start but DB operations will fail "
                + "until ConnectionStrings__DefaultConnection is fixed on Render.");
            return;
        }

        if (env.IsDevelopment())
        {
            await DbSeeder.SeedAsync(scope.ServiceProvider);
            return;
        }

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "SUPER_ADMIN", "USER" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        await NotificationPreferenceSeeder.SeedDefaultsAsync(db);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
