---
name: date-timezone-handling
description: Date and timezone conventions for UniClub Hub. Use when storing,
  transferring, or displaying dates — task deadlines, event times, sprint dates,
  member join dates. Prevents timezone shift bugs between PostgreSQL, ASP.NET Core,
  and React frontend.
---

# Date & Timezone Handling (UniClub Hub)

## The Core Rule

**Store UTC everywhere. Display local time only in the UI.**

- PostgreSQL: `timestamptz` column type
- ASP.NET Core: `DateTimeOffset` type (never `DateTime`)
- API transfer: ISO 8601 string with UTC offset (`2026-05-01T14:00:00Z`)
- React: parse with `date-fns` or `dayjs`, display in browser local time

Breaking this rule is the #1 cause of "event shows wrong time" bugs.

---

## Backend (ASP.NET Core)

### Always use `DateTimeOffset`, never `DateTime`

```csharp
// WRONG — DateTime has no timezone info; ambiguous in PostgreSQL
public DateTime CreatedAt { get; set; }
public DateTime? Deadline { get; set; }

// CORRECT — DateTimeOffset stores the offset; maps to timestamptz in PostgreSQL
public DateTimeOffset CreatedAt { get; set; }
public DateTimeOffset? Deadline { get; set; }
```

### Always use `DateTimeOffset.UtcNow` for server-generated timestamps

```csharp
// WRONG
task.CreatedAt = DateTime.Now;    // Local server time — wrong on cloud servers
task.CreatedAt = DateTime.UtcNow; // UTC but DateTime — still no offset stored

// CORRECT
task.CreatedAt = DateTimeOffset.UtcNow;  // UTC with +00:00 offset
```

### EF Core configuration — map to PostgreSQL `timestamptz`

```csharp
// In IEntityTypeConfiguration<T>:
builder.Property(t => t.CreatedAt)
    .HasColumnType("timestamptz")
    .IsRequired();

builder.Property(t => t.Deadline)
    .HasColumnType("timestamptz");
```

### Accepting dates from the frontend in API requests

```csharp
// Request DTO — accept ISO 8601 string and parse to DateTimeOffset
public record CreateEventRequest(
    string Title,
    // Frontend sends "2026-05-01T14:00:00+07:00" (user's local time with offset)
    // ASP.NET Core deserializes this to DateTimeOffset automatically
    DateTimeOffset StartDate,
    DateTimeOffset EndDate
);

// In the Service — convert to UTC before storing
public async Task<EventResponse> CreateEventAsync(CreateEventRequest request, CancellationToken ct)
{
    var ev = new Event
    {
        Title     = request.Title,
        // ToUniversalTime() normalizes to UTC (+00:00) regardless of input offset
        StartDate = request.StartDate.ToUniversalTime(),
        EndDate   = request.EndDate.ToUniversalTime(),
        CreatedAt = DateTimeOffset.UtcNow,
    };
    // ...
}
```

### Date range queries

```csharp
// Always compare in UTC
var now = DateTimeOffset.UtcNow;
var upcoming = await _db.Events
    .Where(e => e.StartDate >= now)
    .OrderBy(e => e.StartDate)
    .ToListAsync(ct);
```

---

## API Transfer Format

All `DateTimeOffset` values serialize to ISO 8601 by default with ASP.NET Core's `System.Text.Json`.
The format is: `2026-05-01T14:00:00+00:00` or `2026-05-01T14:00:00Z` (UTC).

Verify your `Program.cs` JSON options do not override this:

```csharp
builder.Services.AddControllers().AddJsonOptions(options =>
{
    // Default is fine — DateTimeOffset serializes as ISO 8601
    // Do NOT set DateTimeZoneHandling or DateParseHandling here
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
```

---

## Frontend (React)

### Install date-fns (standard for this project)

```bash
npm install date-fns
```

Do NOT use `moment.js` — it is deprecated and increases bundle size.
Use `date-fns` for formatting/manipulation, or `dayjs` if tree-shaking is a concern.

### Display dates in browser local time

```typescript
import { format, formatDistanceToNow, isPast, isToday, parseISO } from "date-fns";

// Parse ISO string from API — date-fns handles timezone offset automatically
function formatDeadline(isoString: string): string {
  const date = parseISO(isoString);  // Parses "2026-05-01T14:00:00Z" to Date object

  if (isPast(date)) {
    return `Overdue (${formatDistanceToNow(date, { addSuffix: true })})`;
  }
  if (isToday(date)) {
    return `Due today at ${format(date, "HH:mm")}`;
  }
  // format() uses browser's local timezone automatically
  return format(date, "dd/MM/yyyy HH:mm");
}
```

### Format patterns used in UniClub Hub

```typescript
// Consistent format strings across the project — import these constants
export const DATE_FORMATS = {
  date:      "dd/MM/yyyy",           // 01/05/2026
  datetime:  "dd/MM/yyyy HH:mm",     // 01/05/2026 14:00
  time:      "HH:mm",                // 14:00
  iso:       "yyyy-MM-dd",           // 2026-05-01 (for API date-only fields)
  relative:  undefined,              // use formatDistanceToNow()
} as const;
```

### datetime-local input — read and write correctly

```typescript
// Convert ISO string from API to datetime-local input value
function toDatetimeLocal(isoString: string | undefined): string {
  if (!isoString) return "";
  const date = parseISO(isoString);
  // datetime-local requires "YYYY-MM-DDTHH:mm" in local time
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

// Convert datetime-local input value back to ISO string for API
function fromDatetimeLocal(value: string): string {
  if (!value) return "";
  // new Date() parses "YYYY-MM-DDTHH:mm" as local time
  // toISOString() converts to UTC ISO string
  return new Date(value).toISOString();
}

// Usage with react-hook-form:
// defaultValues: { deadline: toDatetimeLocal(task.deadline) }
// On submit: { ...values, deadline: fromDatetimeLocal(values.deadline) }
```

### Display relative time for recent events

```typescript
import { formatDistanceToNow, parseISO } from "date-fns";

// "3 hours ago", "in 2 days"
export function RelativeTime({ isoString }: { isoString: string }) {
  return (
    <time dateTime={isoString} title={format(parseISO(isoString), "dd/MM/yyyy HH:mm")}>
      {formatDistanceToNow(parseISO(isoString), { addSuffix: true })}
    </time>
  );
}
```

---

## Validation Checklist

- [ ] All Entity timestamp properties use `DateTimeOffset`, not `DateTime`
- [ ] All Entity timestamp columns use `timestamptz` in EF configuration
- [ ] Server-generated timestamps use `DateTimeOffset.UtcNow`
- [ ] API receives user dates as `DateTimeOffset`, stored as `.ToUniversalTime()`
- [ ] Frontend uses `date-fns` with `parseISO()` — not `new Date(string)` for non-local strings
- [ ] `datetime-local` inputs use `toDatetimeLocal()` helper for display and `fromDatetimeLocal()` for submission
- [ ] No `moment.js` in the project

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `DateTime.UtcNow` instead of `DateTimeOffset.UtcNow` | Stored without offset — ambiguous across servers | Always `DateTimeOffset.UtcNow` |
| `timestamp` instead of `timestamptz` in PostgreSQL | No timezone stored — reads differently per server locale | Always `timestamptz` |
| `new Date("2026-05-01T14:00:00Z")` | Correct — parses UTC | Use `parseISO` from `date-fns` for consistency |
| `new Date("2026-05-01")` | Parsed as UTC midnight, displays as previous day in UTC+7 | Use `parseISO` and be aware of date-only strings |
| `format(date, ...)` without `parseISO` | Passes string to format — throws or wrong output | Always `parseISO(string)` before `format()` |
| `Guid.NewGuid()` in seed data dates | Seed data regenerates with new timestamps on migration re-run | Use hardcoded `DateTimeOffset` values in `HasData()` |
