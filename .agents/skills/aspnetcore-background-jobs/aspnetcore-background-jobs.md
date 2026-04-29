---
name: aspnetcore-background-jobs
description: Background job processing with Hangfire in ASP.NET Core for UniClub Hub.
  Use when implementing scheduled reminders, deadline notifications, async heavy
  operations, or recurring tasks (workload recalculation, sprint summary emails).
  Do not use IHostedService or System.Threading.Timer for these scenarios.
---

# Background Jobs — Hangfire (UniClub Hub)

## When to Use

- Deadline reminder notifications (send email/push 24h before task deadline)
- Recurring workload recalculation for the Operations dashboard
- Sprint summary email sent after sprint ends
- Heavy operations that should not block an HTTP response (e.g., bulk import processing)
- Retry-on-failure for external service calls (email, external APIs)

## When Not to Use

- Realtime updates → use SignalR (see `aspnetcore-signalr-realtime`)
- Simple in-process async → use `async/await` in Service, no job needed
- Database migrations or seed data → never run these as background jobs

## Stack

```bash
dotnet add package Hangfire.AspNetCore
dotnet add package Hangfire.PostgreSql  # PostgreSQL storage — matches project DB
```

---

## Workflow

### Step 1: Install and configure Hangfire in Program.cs

```csharp
// UniClubHub.API/Program.cs

using Hangfire;
using Hangfire.PostgreSql;

// Add Hangfire with PostgreSQL storage
// Hangfire creates its own schema/tables in the same database
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options =>
    {
        // Reuse the same connection string — Hangfire manages its own tables
        options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"));
    }));

// Add the Hangfire server (processes jobs in the background)
builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 2;  // Keep low for a modular monolith; scale up if needed
    options.Queues = new[] { "critical", "default", "low" };  // Priority queues
});

var app = builder.Build();

// Expose the Hangfire dashboard — restrict to Admin role in production
app.MapHangfireDashboard("/admin/jobs", new DashboardOptions
{
    Authorization = new[] { new HangfireAdminAuthFilter() }
});
```

```csharp
// UniClubHub.API/Infrastructure/HangfireAdminAuthFilter.cs
using Hangfire.Dashboard;

public class HangfireAdminAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        // Allow only authenticated users with the Admin role
        return httpContext.User.Identity?.IsAuthenticated == true
            && httpContext.User.IsInRole("Admin");
    }
}
```

---

### Step 2: Define job classes in the Operations module

Job classes are Services — register them in the module's `DependencyInjection.cs`.
Do NOT put job logic in Controllers.

```csharp
// UniClubHub.Operations/Jobs/DeadlineReminderJob.cs

using Hangfire;
using UniClubHub.Shared;
using Microsoft.EntityFrameworkCore;

namespace UniClubHub.Operations.Jobs;

public class DeadlineReminderJob
{
    private readonly UniClubDbContext _db;
    private readonly INotificationService _notifications;
    private readonly ILogger<DeadlineReminderJob> _logger;

    public DeadlineReminderJob(
        UniClubDbContext db,
        INotificationService notifications,
        ILogger<DeadlineReminderJob> logger)
    {
        _db = db;
        _notifications = notifications;
        _logger = logger;
    }

    // Job methods must be public and should be async
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 600 })]
    public async Task SendDeadlineRemindersAsync(CancellationToken ct = default)
    {
        var tomorrow = DateTimeOffset.UtcNow.AddHours(24);
        var now = DateTimeOffset.UtcNow;

        var dueTasks = await _db.Tasks
            .AsNoTracking()
            .Where(t =>
                t.Status != "Done" &&
                t.Status != "Cancelled" &&
                t.Deadline.HasValue &&
                t.Deadline.Value > now &&
                t.Deadline.Value <= tomorrow &&
                t.AssignedToMemberId.HasValue)
            .Include(t => t.AssignedToMember)
            .ToListAsync(ct);

        _logger.LogInformation("Sending deadline reminders for {Count} tasks", dueTasks.Count);

        foreach (var task in dueTasks)
        {
            try
            {
                await _notifications.SendDeadlineReminderAsync(task, ct);
            }
            catch (Exception ex)
            {
                // Log per-task failures but continue — don't fail the whole job
                _logger.LogWarning(ex, "Failed to send reminder for task {TaskId}", task.Id);
            }
        }
    }
}
```

---

### Step 3: Register job classes in module DependencyInjection

```csharp
// UniClubHub.Operations/DependencyInjection.cs

public static class DependencyInjection
{
    public static IServiceCollection AddOperationsModule(this IServiceCollection services)
    {
        // Services
        services.AddScoped<TaskService>();
        services.AddScoped<ActivityService>();
        services.AddScoped<SprintService>();

        // Job classes must be registered in DI — Hangfire resolves them via DI
        services.AddScoped<DeadlineReminderJob>();
        services.AddScoped<SprintSummaryJob>();
        services.AddScoped<WorkloadRecalculationJob>();

        return services;
    }
}
```

---

### Step 4: Schedule jobs — three patterns

**Pattern A: Recurring job (cron schedule)**

```csharp
// Register in Program.cs after app.Build()
// Run reminder check every hour
RecurringJob.AddOrUpdate<DeadlineReminderJob>(
    recurringJobId: "deadline-reminders-hourly",
    methodCall: job => job.SendDeadlineRemindersAsync(CancellationToken.None),
    cronExpression: Cron.Hourly(),
    queue: "default"
);

// Recalculate workload every night at midnight UTC
RecurringJob.AddOrUpdate<WorkloadRecalculationJob>(
    recurringJobId: "workload-recalc-daily",
    methodCall: job => job.RecalculateAsync(CancellationToken.None),
    cronExpression: Cron.Daily(0),
    queue: "low"
);
```

**Pattern B: Delayed job (fire once after delay)**

```csharp
// Inside a Service — enqueue a job to run after a delay
// Example: send welcome email 5 minutes after a member joins a sprint

public class SprintService
{
    private readonly IBackgroundJobClient _jobs;

    public SprintService(IBackgroundJobClient jobs) { _jobs = jobs; }

    public async Task AddMemberToSprintAsync(Guid sprintId, Guid memberId, CancellationToken ct)
    {
        // ... save to DB ...

        // Fire-and-forget after 5 minutes
        _jobs.Schedule<SprintSummaryJob>(
            job => job.SendWelcomeAsync(sprintId, memberId, CancellationToken.None),
            TimeSpan.FromMinutes(5)
        );
    }
}
```

**Pattern C: Fire-and-forget (enqueue immediately)**

```csharp
// Use for heavy operations that must not block the HTTP response
// Example: bulk import processing

[HttpPost("import")]
public async Task<IActionResult> ImportTasks([FromForm] IFormFile file)
{
    // Save the file reference, then enqueue processing
    var importId = await _importService.SaveFileAsync(file);

    _backgroundJobs.Enqueue<BulkImportJob>(
        job => job.ProcessAsync(importId, CancellationToken.None),
        queue: "default"
    );

    // Return immediately — client polls /import/{importId}/status
    return Accepted(new { importId });
}
```

---

### Step 5: Continuations — chain jobs in sequence

```csharp
// Send sprint summary only after workload recalculation completes
var recalcJobId = _jobs.Enqueue<WorkloadRecalculationJob>(
    job => job.RecalculateAsync(sprintId, CancellationToken.None)
);

_jobs.ContinueJobWith<SprintSummaryJob>(
    recalcJobId,
    job => job.SendSummaryAsync(sprintId, CancellationToken.None)
);
```

---

## Validation Checklist

- [ ] Hangfire uses PostgreSQL storage (not in-memory)
- [ ] Dashboard is protected by `HangfireAdminAuthFilter`
- [ ] Job classes are registered as `AddScoped` in module `DependencyInjection.cs`
- [ ] `IBackgroundJobClient` is injected — never call `BackgroundJob.Enqueue()` as a static method
- [ ] `AutomaticRetry` attribute is set on job methods
- [ ] Recurring job IDs are descriptive constants, not magic strings
- [ ] CancellationToken is passed through to DB queries inside jobs
- [ ] Per-item failures inside a job are caught and logged — do not fail the whole job

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Using `IHostedService` + `Timer` | No retry, no visibility, no dashboard | Use Hangfire for all scheduled work |
| `BackgroundJob.Enqueue()` static call | Cannot be mocked in tests | Inject and use `IBackgroundJobClient` |
| `AddTransient` for job classes | Hangfire creates a new scope per job; transient within that is fine, but scoped services need `AddScoped` | Register job classes as `AddScoped` |
| Job method not public | Hangfire cannot serialize/invoke | All job methods must be `public` |
| Long-running job without cancellation | Job hangs on shutdown | Always accept and pass `CancellationToken` |
| Storing large payloads as job arguments | Hangfire serializes arguments to DB — large blobs bloat the jobs table | Store data in DB first, pass only the ID as the argument |
