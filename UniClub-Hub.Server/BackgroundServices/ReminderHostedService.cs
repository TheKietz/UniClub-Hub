using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Shared.Common.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.BackgroundServices;

/// <summary>
/// Hourly sweep that reminds assignees of tasks whose deadline falls within the
/// next 24 hours and which are not yet done. Each task is reminded at most once
/// per process lifetime (in-memory dedupe) to avoid hourly spam.
/// </summary>
public class ReminderHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<ReminderHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);
    private static readonly TimeSpan ReminderWindow = TimeSpan.FromHours(24);

    // Tasks already reminded this process lifetime (cheap dedupe; durable dedupe is a later concern).
    private readonly HashSet<int> _reminded = [];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Small startup delay so the app finishes booting before the first sweep.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunSweepAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "ReminderHostedService sweep failed.");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task RunSweepAsync(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var until = now.Add(ReminderWindow);

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<UniClubDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var dueTasks = await db.Tasks
            .AsNoTracking()
            .Where(t => !t.IsDeleted
                     && t.Status != ClubTaskStatus.Done
                     && t.AssignedTo != null
                     && t.Deadline != null
                     && t.Deadline > now
                     && t.Deadline <= until)
            .Select(t => new { t.Id, t.Title, t.AssignedTo, t.Deadline })
            .ToListAsync(ct);

        foreach (var task in dueTasks)
        {
            if (!_reminded.Add(task.Id)) continue; // already reminded this lifetime

            await notifications.SendAsync(
                task.AssignedTo!,
                "Sắp đến hạn công việc",
                $"Công việc \"{task.Title}\" sẽ đến hạn trong vòng 24 giờ.",
                NotificationType.DeadlineReminder,
                relatedEntityType: "Task",
                relatedEntityId: task.Id);
        }
    }
}
