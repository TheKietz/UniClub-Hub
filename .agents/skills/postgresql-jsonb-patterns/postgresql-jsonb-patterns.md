---
name: postgresql-jsonb-patterns
description: Use PostgreSQL JSONB columns with EF Core for flexible metadata,
  configuration, and dynamic fields. Use when a feature requires schema-flexible
  data (workflow config, custom activity fields, notification settings) without
  creating extra tables. Includes query, index, and when-not-to-use guidance.
---

# PostgreSQL JSONB Patterns (UniClub Hub)

## When to Use JSONB

Use JSONB when the data is:
- **Schema-flexible**: different activities may have different metadata fields
- **Read-mostly**: queried occasionally by key, not filtered heavily
- **Owned by one entity**: the JSON blob belongs entirely to one row, not shared
- **Not foreign-keyed**: no other table references fields inside the JSON

Good candidates in UniClub Hub:
- `Activity.Metadata` — custom fields per activity type (venue map URL, registration form config)
- `WorkflowStep.Config` — step-specific configuration (approver list, condition expression)
- `NotificationPreference.Settings` — per-user channel/frequency settings
- `Sprint.ReviewNotes` — free-form structured notes after sprint review

## When NOT to Use JSONB

- The field is filtered/sorted frequently → use a proper column with an index
- The field is referenced by foreign key from another table → normalize it
- The data has a fixed, well-known schema → use typed columns (clearer, safer)
- You need EF Core to track individual property changes → JSONB is tracked as a whole blob

---

## Workflow

### Step 1: Define the JSONB column on the Entity

```csharp
// UniClubHub.Shared/Models/Activity.cs

public class Activity
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;

    // JSONB column — store as Dictionary for maximum flexibility,
    // or as a typed class (see Step 2 for typed approach).
    // Dictionary approach: use when fields are truly dynamic and unknown at design time.
    public Dictionary<string, object>? Metadata { get; set; }
}
```

---

### Step 2: Choose Dictionary vs Typed class

**Option A — Dictionary (fully dynamic schema):**

Use when you genuinely cannot know the keys at design time.

```csharp
// Entity property
public Dictionary<string, object>? Metadata { get; set; }

// Configuration (Step 3) uses .HasColumnType("jsonb")
```

**Option B — Typed owned class (known shape, but no separate table needed):**

Use when you know the shape but don't want a separate table.
This is the preferred approach when the schema is stable.

```csharp
// UniClubHub.Shared/Models/ValueObjects/ActivityMetadata.cs
public class ActivityMetadata
{
    public string? VenueMapUrl    { get; set; }
    public int?    MaxParticipants { get; set; }
    public bool    RequiresApproval { get; set; }
    public List<string> Tags      { get; set; } = new();
}

// Entity property — typed
public ActivityMetadata? Metadata { get; set; }
```

---

### Step 3: Configure JSONB in IEntityTypeConfiguration

```csharp
// UniClubHub.Shared/Configurations/ActivityConfiguration.cs

public class ActivityConfiguration : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> builder)
    {
        builder.ToTable("Activities");

        // Option A: Dictionary<string, object>
        builder.Property(a => a.Metadata)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, object>>(v, (JsonSerializerOptions?)null)
            );

        // Option B: Typed class — Npgsql handles serialization automatically
        // when you call .HasColumnType("jsonb")
        builder.Property(a => a.Metadata)
            .HasColumnType("jsonb");
    }
}
```

**For Option B (typed class) with Npgsql, also register the type in Program.cs:**

```csharp
// Program.cs — tell Npgsql to serialize this type as JSONB
using Npgsql;

// Required for EF Core + Npgsql to handle POCO serialization to jsonb
NpgsqlConnection.GlobalTypeMapper.UseJsonNet();
// Or with System.Text.Json (Npgsql 6+):
// builder.Services.ConfigureNpgsqlDataSource() handles this automatically
// if you use the new NpgsqlDataSourceBuilder API
```

---

### Step 4: Querying JSONB with EF Core

**Read the whole blob (most common):**

```csharp
// Simply include the entity — EF deserializes automatically
var activity = await _db.Activities
    .AsNoTracking()
    .FirstOrDefaultAsync(a => a.Id == activityId, ct);

var maxParticipants = activity?.Metadata?.MaxParticipants;
```

**Filter by a JSONB field using raw SQL (EF LINQ cannot translate JSONB operators):**

```csharp
// Find all activities that require approval
var activities = await _db.Activities
    .FromSqlInterpolated($@"
        SELECT * FROM ""Activities""
        WHERE ""Metadata"" @> '{""RequiresApproval"": true}'::jsonb
    ")
    .AsNoTracking()
    .ToListAsync(ct);

// Find activities with a specific tag
var tagged = await _db.Activities
    .FromSqlInterpolated($@"
        SELECT * FROM ""Activities""
        WHERE ""Metadata"" -> 'Tags' ? {tagName}
    ")
    .AsNoTracking()
    .ToListAsync(ct);
```

**Update a specific JSONB key without loading the full entity:**

```csharp
// Update a single key in the JSONB column via raw SQL — avoids loading the full entity
await _db.Database.ExecuteSqlInterpolatedAsync($@"
    UPDATE ""Activities""
    SET ""Metadata"" = jsonb_set(""Metadata"", '{{MaxParticipants}}', {maxParticipants}::text::jsonb)
    WHERE ""Id"" = {activityId}
", ct);
```

---

### Step 5: Add a GIN index for JSONB queries (Migration)

If you query JSONB fields frequently, add a GIN index.
Propose this to the user as part of the schema approval workflow.

```csharp
// Inside ActivityConfiguration.Configure():
builder.HasIndex(a => a.Metadata)
    .HasMethod("gin");  // GIN index — required for @> and ? operators on JSONB
```

Or in a migration directly:

```csharp
migrationBuilder.Sql(@"
    CREATE INDEX IF NOT EXISTS ""IX_Activities_Metadata_gin""
    ON ""Activities"" USING gin (""Metadata"" jsonb_path_ops);
");
```

Use `jsonb_path_ops` (more compact, faster for `@>`) vs `jsonb_ops` (supports more operators including `?`).
Pick based on which operators your queries use.

---

### Step 6: Handling JSONB in DTOs and API responses

Never expose the raw `Dictionary<string, object>` directly from an API endpoint.
Map to a typed response DTO:

```csharp
// UniClubHub.Operations/DTOs/ActivityResponse.cs
public record ActivityResponse(
    Guid   Id,
    string Title,
    ActivityMetadataDto? Metadata
);

public record ActivityMetadataDto(
    string? VenueMapUrl,
    int?    MaxParticipants,
    bool    RequiresApproval,
    List<string> Tags
);

// In ActivityService:
private static ActivityResponse MapToResponse(Activity a) => new(
    a.Id,
    a.Title,
    a.Metadata is null ? null : new ActivityMetadataDto(
        a.Metadata.VenueMapUrl,
        a.Metadata.MaxParticipants,
        a.Metadata.RequiresApproval,
        a.Metadata.Tags
    )
);
```

---

## Validation

- [ ] JSONB column configured with `.HasColumnType("jsonb")` in `IEntityTypeConfiguration`
- [ ] Typed class used when schema is known; Dictionary only when truly dynamic
- [ ] JSONB fields filtered via `FromSqlInterpolated`, not LINQ (EF cannot translate JSONB operators)
- [ ] GIN index added if the column is queried by content
- [ ] Raw `Dictionary<string, object>` is never returned directly from API — always mapped to DTO
- [ ] JSONB updates for single keys use `jsonb_set` to avoid full row rewrites

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Using `Dictionary<string, object>` when schema is known | Loses type safety, breaks on rename | Use typed owned class instead |
| Filtering JSONB with LINQ `.Where()` | EF cannot translate to SQL — throws or does client-side eval | Use `FromSqlInterpolated` with PostgreSQL operators |
| No GIN index on frequently queried JSONB | Full table scan on every `@>` query | Add `HasMethod("gin")` index |
| Overusing JSONB for everything flexible | Hides schema in blobs, makes reporting and joins impossible | JSONB is for metadata, not core relational data |
| Updating full entity to change one JSONB key | Loads and rewrites entire row | Use `jsonb_set` via raw SQL for partial updates |
