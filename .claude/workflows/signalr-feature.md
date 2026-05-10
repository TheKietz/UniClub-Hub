---
description: Guide the Agent to implement a complete realtime feature from the SignalR Hub to the React client. Applies to the Operations module only. Use for: task status updates, live Kanban board sync, sprint board realtime.
---

# Workflow: /signalr-feature [EventName]

> **Examples**:
> `/signalr-feature TaskStatusUpdated`
> `/signalr-feature SprintProgressUpdated`

---

## Step 0 — Check prerequisites

Before starting, verify all of the following exist. If any are missing, create them first — do not proceed until all are in place:

- [ ] `UniClub-Hub.Shared/Constants/SignalREvents.cs` — if missing, create it
- [ ] `UniClub-Hub.Server/Hubs/OperationsHub.cs` — if missing, set up the Hub first (see `aspnetcore-signalr-realtime` Steps 3–4)
- [ ] `src/constants/signalREvents.ts` — if missing, create it
- [ ] `src/lib/signalr/operationsHub.ts` — if missing, create the singleton connection

---

## Step 1 — Register the event name constant (both sides)

Apply skill: **`aspnetcore-signalr-realtime`** + rule **`uniclub-signalr-contracts`**

**Backend** — add to `UniClub-Hub.Shared/Constants/SignalREvents.cs`:

```csharp
public const string [EventName] = "[EventName]";
```

**Frontend** — add to `src/constants/signalREvents.ts`:

```typescript
export const SignalREvents = {
  // ...existing...
  [EventName]: "[EventName]",
} as const;
```

**Required**: The constant value must be identical in both files.
Never hardcode event name strings anywhere else in the codebase.

---

## Step 2 — Define the Payload DTO (both sides)

**Backend** — create a typed record in the Service or in `UniClub-Hub.Shared/DTOs/SignalR/`:

```csharp
public record [EventName]Payload(
    Guid   ResourceId,
    string NewState,
    DateTimeOffset UpdatedAt
    // Only include fields the client actually needs to update the UI
    // Never include sensitive data
);
```

**Frontend** — add to `src/features/operations/types/`:

```typescript
export interface [EventName]Payload {
  resourceId: string;
  newState: string;
  updatedAt: string;
}
```

---

## Step 3 — Broadcast from the Service (Backend)

Apply skill: **`aspnetcore-signalr-realtime`** (Step 5)

Inside the Service method that handles the state change, inject `IHubContext<OperationsHub>` and broadcast:

```csharp
await _hub.Clients
    .Group(OperationsHub.GetGroupName(activityId))  // Only broadcast to the relevant group
    .SendAsync(SignalREvents.[EventName], payload, ct);
```

Checklist:

- [ ] Use `Clients.Group()` — never `Clients.All()`
- [ ] Use the constant `SignalREvents.[EventName]` — never hardcode the string
- [ ] Payload is a typed record — never an anonymous object
- [ ] Broadcast happens after `SaveChangesAsync()` succeeds — never before

---

## Step 4 — Listen for the event in React (Frontend)

Create or update the custom hook:

```
src/features/operations/hooks/use[Context]Realtime.ts
```

Apply skill: **`aspnetcore-signalr-realtime`** (Step 6)

```typescript
useEffect(() => {
  const hub = getOperationsHub(getToken);

  async function setup() {
    await startHub(hub);
    await hub.invoke(SignalREvents.JoinActivityGroup, activityId);

    hub.on(SignalREvents.[EventName], (payload: [EventName]Payload) => {
      // Prefer: optimistic cache update over a full refetch
      queryClient.setQueryData(queryKeys.[resource].byActivity(activityId), (old) => {
        // update the relevant item in cache
      });
    });
  }

  setup();

  return () => {
    hub.invoke(SignalREvents.LeaveActivityGroup, activityId).catch(() => {});
    hub.off(SignalREvents.[EventName]);  // Required — prevents memory leaks
  };
}, [activityId]);
```

Checklist:

- [ ] `hub.off()` is called in the cleanup function — prevents memory leak and duplicate handlers
- [ ] Uses `SignalREvents.[EventName]` constant — never a hardcoded string
- [ ] Prefer `setQueryData` for cache update; fall back to `invalidateQueries` only if not possible
- [ ] `hub.invoke(LeaveActivityGroup)` is called on unmount

---

## Step 5 — Verify CORS and Auth

Only needed the first time SignalR is set up — skip if the Hub is already working:

- [ ] CORS policy uses `WithOrigins(...)` + `AllowCredentials()` — never `AllowAnyOrigin()`
- [ ] Hub has the `[Authorize]` attribute
- [ ] `accessTokenFactory` is configured in the frontend `HubConnectionBuilder`

---

## Step 6 — Final checklist

- [ ] Event name constant exists in both `SignalREvents.cs` and `signalREvents.ts` with identical values
- [ ] Payload DTO is typed on both backend (record) and frontend (interface)
- [ ] Broadcast occurs after `SaveChangesAsync()`, using `Clients.Group()`
- [ ] Frontend cleans up with `hub.off()` in the `useEffect` return
- [ ] No raw event name strings anywhere in the codebase
- [ ] `TODO.md` updated
