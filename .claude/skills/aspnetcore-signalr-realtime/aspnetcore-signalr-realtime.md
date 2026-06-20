---
name: aspnetcore-signalr-realtime
description: Implement SignalR Hubs in ASP.NET Core and connect from React client
  for realtime features. Use when building task status updates, live Kanban board
  sync, or any push notification feature in the Operations module of UniClub Hub.
---

# ASP.NET Core SignalR — Realtime Features (UniClub Hub)

## When to Use

- Task status changes that must reflect immediately for all connected users
- Live Kanban board updates when another member moves a card
- Real-time progress percentage updates on shared activities
- Sprint board changes visible to the whole team without refresh

## When Not to Use

- Notifications that can tolerate delay (use email/web notification via NotificationService instead)
- Data that only one user sees (use regular REST polling)
- Portal module public pages — SignalR is scoped to Operations module only

## Project-Specific Context

- **Hub location**: `UniClub-Hub.Server/Hubs/`
- **Constants file**: `UniClub-Hub.Shared/Constants/SignalREvents.cs`
- **Scope**: Operations module only — do NOT add Hub methods for Membership or Portal
- **Auth**: Hubs use the same JWT bearer token as REST endpoints

---

## Workflow

### Step 1: Define event name constants (Shared project)

All Hub method names and client event names must be constants.
Never use raw string literals anywhere in Hub or frontend code.

```csharp
// UniClub-Hub.Shared/Constants/SignalREvents.cs

namespace UniClub_Hub.Shared.Constants;

public static class SignalREvents
{
    // Client-to-server (Hub methods the client can invoke)
    public const string JoinActivityGroup  = "JoinActivityGroup";
    public const string LeaveActivityGroup = "LeaveActivityGroup";

    // Server-to-client (events the server broadcasts, client listens)
    public const string TaskStatusUpdated  = "TaskStatusUpdated";
    public const string TaskAssigned       = "TaskAssigned";
    public const string TaskProgressUpdated = "TaskProgressUpdated";
    public const string MemberJoinedActivity = "MemberJoinedActivity";
}
```

---

### Step 2: Install the SignalR package

SignalR is built into ASP.NET Core — no extra NuGet needed for the server.
For the React client:

```bash
npm install @microsoft/signalr
```

---

### Step 3: Create the Hub class

```csharp
// UniClub-Hub.Server/Hubs/OperationsHub.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using UniClub_Hub.Shared.Constants;

namespace UniClub_Hub.Server.Hubs;

// Require JWT auth on the Hub — same policy as REST endpoints
[Authorize]
public class OperationsHub : Hub
{
    // Client calls this to subscribe to updates for a specific activity
    public async Task JoinActivityGroup(Guid activityId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GetGroupName(activityId));
    }

    public async Task LeaveActivityGroup(Guid activityId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetGroupName(activityId));
    }

    // Consistent group name format — always use this helper, never build the string inline
    public static string GetGroupName(Guid activityId) => $"activity-{activityId}";

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Groups are cleaned up automatically on disconnect by SignalR —
        // no manual cleanup needed here unless you track connections in DB.
        await base.OnDisconnectedAsync(exception);
    }
}
```

---

### Step 4: Register SignalR and map the Hub in Program.cs

```csharp
// UniClub-Hub.Server/Program.cs

// Add SignalR to DI
builder.Services.AddSignalR(options =>
{
    // Send keepalive ping every 15s — prevents proxy/load balancer from
    // closing idle WebSocket connections (common with 30s timeout proxies)
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

// CRITICAL: SignalR requires a separate CORS policy from REST endpoints.
// The standard CORS policy with AllowAnyOrigin() will NOT work for SignalR
// because WebSocket requires credentials.
builder.Services.AddCors(options =>
{
    options.AddPolicy("SignalRPolicy", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",   // Vite dev server
                "https://your-production-domain.com"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();  // REQUIRED for SignalR — WithOrigins must list explicit origins (not *)
    });
});

var app = builder.Build();

app.UseCors("SignalRPolicy");
app.UseAuthentication();
app.UseAuthorization();

// Map Hub endpoint — keep under /hubs/ prefix
app.MapHub<OperationsHub>("/hubs/operations");
app.MapControllers();
```

---

### Step 5: Broadcast from a Service (not from a Controller)

Inject `IHubContext<OperationsHub>` into the Service that owns the business logic.
Never inject HubContext into a Controller — keep broadcast logic with the data change.

```csharp
// UniClub-Hub.Operations/Services/TaskService.cs

using Microsoft.AspNetCore.SignalR;
using UniClub_Hub.Server.Hubs;
using UniClub_Hub.Shared.Constants;

public class TaskService
{
    private readonly UniClubDbContext _db;
    private readonly IHubContext<OperationsHub> _hub;

    public TaskService(UniClubDbContext db, IHubContext<OperationsHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task<TaskResponse> UpdateTaskStatusAsync(Guid taskId, string newStatus, CancellationToken ct)
    {
        var task = await _db.Tasks.FindAsync(new object[] { taskId }, ct)
            ?? throw new KeyNotFoundException($"Task {taskId} not found");

        task.Status = newStatus;
        task.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        var payload = new TaskStatusUpdatedPayload
        {
            TaskId    = task.Id,
            NewStatus = task.Status,
            UpdatedAt = task.UpdatedAt.Value
        };

        // Broadcast only to users who joined this activity's group
        await _hub.Clients
            .Group(OperationsHub.GetGroupName(task.ActivityId))
            .SendAsync(SignalREvents.TaskStatusUpdated, payload, ct);

        return MapToResponse(task);
    }
}

// Always use a typed payload DTO — never pass anonymous objects to SendAsync
public record TaskStatusUpdatedPayload(Guid TaskId, string NewStatus, DateTimeOffset UpdatedAt);
```

---

### Step 6: Connect from React frontend

```typescript
// src/lib/signalr/operationsHub.ts

import * as signalR from "@microsoft/signalr";

// Singleton connection — one connection per browser session, not per component
let connection: signalR.HubConnection | null = null;

export function getOperationsHub(getToken: () => string): signalR.HubConnection {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/operations", {
      // Pass JWT token — SignalR uses query string for WebSocket auth
      // (HTTP headers are not available during WebSocket handshake)
      accessTokenFactory: getToken,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Retry delays in ms
    .configureLogging(
      import.meta.env.DEV
        ? signalR.LogLevel.Information
        : signalR.LogLevel.Warning
    )
    .build();

  return connection;
}

export async function startHub(hub: signalR.HubConnection): Promise<void> {
  if (hub.state === signalR.HubConnectionState.Disconnected) {
    await hub.start();
  }
}

export async function stopHub(hub: signalR.HubConnection): Promise<void> {
  if (hub.state !== signalR.HubConnectionState.Disconnected) {
    await hub.stop();
  }
}
```

```typescript
// src/constants/signalREvents.ts
// Mirror of UniClub-Hub.Shared/Constants/SignalREvents.cs
// Must be kept in sync manually — never hardcode these strings in components

export const SignalREvents = {
  JoinActivityGroup:    "JoinActivityGroup",
  LeaveActivityGroup:   "LeaveActivityGroup",
  TaskStatusUpdated:    "TaskStatusUpdated",
  TaskAssigned:         "TaskAssigned",
  TaskProgressUpdated:  "TaskProgressUpdated",
  MemberJoinedActivity: "MemberJoinedActivity",
} as const;
```

```typescript
// src/hooks/useActivityRealtime.ts
// Usage example — encapsulate SignalR logic in a custom hook, not in components

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getOperationsHub, startHub } from "@/lib/signalr/operationsHub";
import { SignalREvents } from "@/constants/signalREvents";
import { useAuthToken } from "@/hooks/useAuthToken";

interface TaskStatusUpdatedPayload {
  taskId: string;
  newStatus: string;
  updatedAt: string;
}

export function useActivityRealtime(activityId: string) {
  const queryClient = useQueryClient();
  const { getToken } = useAuthToken();

  useEffect(() => {
    const hub = getOperationsHub(getToken);

    async function setup() {
      await startHub(hub);

      // Join the group for this specific activity
      await hub.invoke(SignalREvents.JoinActivityGroup, activityId);

      // Listen for task status changes — invalidate query cache to refetch
      hub.on(SignalREvents.TaskStatusUpdated, (payload: TaskStatusUpdatedPayload) => {
        // Optimistic: update the specific task in cache without full refetch
        queryClient.setQueryData(
          ["tasks", activityId],
          (old: TaskStatusUpdatedPayload[] | undefined) =>
            old?.map((t) =>
              t.taskId === payload.taskId ? { ...t, newStatus: payload.newStatus } : t
            )
        );
      });
    }

    setup();

    return () => {
      // Leave group and remove listener on unmount
      hub.invoke(SignalREvents.LeaveActivityGroup, activityId).catch(() => {});
      hub.off(SignalREvents.TaskStatusUpdated);
    };
  }, [activityId]);  // Re-run if activityId changes
}
```

---

## Validation

- [ ] Hub is mapped under `/hubs/` prefix
- [ ] CORS policy uses `AllowCredentials()` with explicit origins (no wildcard)
- [ ] JWT auth is configured on the Hub via `[Authorize]`
- [ ] All event names reference constants from `SignalREvents.cs` / `signalREvents.ts`
- [ ] Frontend uses singleton connection, not one per component
- [ ] `withAutomaticReconnect()` is configured
- [ ] `IHubContext` is injected into Service, not Controller
- [ ] Payloads are typed DTOs/records, not anonymous objects

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `AllowAnyOrigin().AllowCredentials()` | SignalR CORS will throw at startup — these two cannot be combined | Use `WithOrigins(...)` with explicit URLs |
| New `HubConnection` per React component | Multiple WebSocket connections per user, events fire multiple times | Use singleton `getOperationsHub()` |
| Raw string in `hub.on("TaskStatusUpdated", ...)` | Silent mismatch if backend constant changes | Always use `SignalREvents` constants file |
| Injecting `IHubContext` in Controller | Couples transport to HTTP layer | Move broadcast to Service layer |
| Not calling `hub.off()` on unmount | Memory leak and duplicate event handlers | Always clean up in `useEffect` return |
| Broadcasting to `Clients.All` | Every connected user receives updates they don't need | Always use `Clients.Group(...)` |
