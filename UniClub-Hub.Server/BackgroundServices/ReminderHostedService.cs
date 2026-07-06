using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.Services;
using UniClub_Hub.Shared.Common.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.BackgroundServices;

/// <summary>
/// Hourly sweep over not-yet-done tasks due within the next 48 hours. Sends an
/// at-risk warning to tasks that are behind their expected progress, otherwise a
/// "due soon" reminder for tasks within 24h. Each (task, kind) pair is notified at
/// most once per process lifetime (in-memory dedupe) to avoid hourly spam.
/// </summary>
public class ReminderHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<ReminderHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);
    private static readonly TimeSpan LookAhead = TimeSpan.FromHours(48);

    // Keys of the form "risk:{id}" / "due:{id}" already notified this process lifetime.
    private readonly HashSet<string> _notified = [];

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
        var until = now.Add(LookAhead);
        var dueSoon = now.AddHours(24);

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<UniClubDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var tasks = await db.Tasks
            .AsNoTracking()
            .Where(t => !t.IsDeleted
                     && t.Status != ClubTaskStatus.Done
                     && t.AssignedTo != null
                     && t.Deadline != null
                     && t.Deadline > now
                     && t.Deadline <= until)
            .Select(t => new { t.Id, t.Title, t.AssignedTo, t.Deadline, t.StartDate, t.CreatedAt, t.Progress, t.Status })
            .ToListAsync(ct);

        foreach (var task in tasks)
        {
            var start = task.StartDate ?? new DateTimeOffset(DateTime.SpecifyKind(task.CreatedAt, DateTimeKind.Utc));
            var (_, _, atRisk) = DeadlineRisk.Evaluate(start, task.Deadline!.Value, task.Progress, task.Status, now);

            if (atRisk)
            {
                if (_notified.Add($"risk:{task.Id}"))
                    await notifications.SendAsync(
                        task.AssignedTo!,
                        "Công việc có nguy cơ trễ hạn",
                        $"Công việc \"{task.Title}\" đang chậm hơn tiến độ kỳ vọng và sắp đến hạn.",
                        NotificationType.DeadlineReminder,
                        relatedEntityType: "Task",
                        relatedEntityId: task.Id);
            }
            else if (task.Deadline <= dueSoon)
            {
                if (_notified.Add($"due:{task.Id}"))
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
}
