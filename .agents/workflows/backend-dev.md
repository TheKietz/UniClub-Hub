---
description: Guide the Agent to build a complete API feature from Database to Controller following the UniClub Hub Modular Monolith standard. Applies to all modules: Membership, Operations, Portal.
---

# Workflow: /backend-dev [ModuleName] [FeatureName]

> **Example**: `/backend-dev Operations CreateTask`

---

## Step 0 — Read context before doing anything

Before designing, read and cross-reference the following:

- `@project-description.md` → confirm which module the feature belongs to and verify scope
- `@uniclub-monolith-standard` → recall file structure and cross-module rules
- `@architecture.md` → confirm correct project names (`UniClub-Hub.Server`, not `UniClubHub.API`)
- `TODO.md` → update the related task to `[~] Doing`

**Scope check**: If the feature involves Member Management → it belongs to the Membership module. If it involves landing pages or CMS → Portal module. Never implement features across module boundaries.

---

## Step 1 — Propose the Entity Schema (STOP, await approval)

Apply skill: **`ef-core-migrations-postgresql`** (Step 1 checklist)

Present the proposed Entity class in chat. **Do not create any file.** Wait for explicit user confirmation ("Approve" / "Agree") before proceeding.

Entity checklist to verify before proposing:

- [ ] Primary key: `Guid Id`
- [ ] Timestamps: `DateTimeOffset CreatedAt`, `DateTimeOffset? UpdatedAt` — never use `DateTime`
- [ ] Enum properties: use `string` type — never `int`
- [ ] Navigation properties: declared as `null!` (not `new()` or `?`)
- [ ] FK relationships: explicitly define `OnDelete` behavior (Cascade / Restrict)
- [ ] If flexible metadata is needed: consider `Dictionary<string, object>?` JSONB instead of an extra table — see `postgresql-jsonb-patterns`

**Present alongside the proposal:**

- A brief relationship diagram (which table → which table, cardinality)
- Justification for data type choices on important fields

---

## Step 2 — Create the Entity and Configuration files (after approval)

Apply skill: **`ef-core-migrations-postgresql`** (Steps 1–3)

**2a. Create the Entity file:**

```
UniClub-Hub.Shared/Models/[EntityName].cs
```

**2b. Create the Configuration file (required — never inline in OnModelCreating):**

```
UniClub-Hub.Shared/Configurations/[EntityName]Configuration.cs
```

The configuration must include:

- `ToTable("[TableName]")` — explicit table name
- `HasKey()`, `Property()` with `HasMaxLength()` for string columns
- `HasColumnType("timestamptz")` for `DateTimeOffset` properties
- `HasConversion<string>()` for enum properties
- `HasIndex()` for all FK columns
- `HasOne/HasMany` relationships with explicit `OnDelete`

**2c. Register the DbSet in UniClubDbContext:**

```
UniClub-Hub.Shared/UniClubDbContext.cs
```

---

## Step 3 — Create the Migration (suggest command, do not run)

Apply skill: **`ef-core-migrations-postgresql`** (Steps 4–5)

Name migrations using this convention:

```
[Action]_[TableName]_[WhatChanged]
Examples:
  Add_Tasks_InitialSchema
  Alter_Tasks_AddPriorityColumn
  Seed_ActivityCategories
```

Suggest the command for the user to run — **do not run it yourself**:

```bash
dotnet ef migrations add Add_Tasks_InitialSchema \
  --project UniClub-Hub.Shared \
  --startup-project UniClub-Hub.Server
```

After the user runs the command, review the generated migration file:

- [ ] Column types are PostgreSQL-native (`uuid`, `timestamptz`, `character varying`) — not `nvarchar` or `datetime2`
- [ ] All FK columns have a corresponding `CreateIndex`
- [ ] `Down()` method exists and correctly reverses `Up()`
- [ ] No unintended `DropTable` or `DropColumn`

---

## Step 4 — Build DTOs (Module Project)

Apply: **`uniclub-monolith-standard`** (DTO naming convention)

Create at: `UniClub-Hub.[ModuleName]/DTOs/`

Naming:

- `Create[Resource]Request` — for POST body
- `Update[Resource]Request` — for PUT/PATCH body
- `[Resource]Response` — for full detail response
- `[Resource]SummaryResponse` — for list responses (only necessary fields)

Rules:

- **Never expose Entity classes directly** from endpoints
- `Request` and `Response` DTOs must be separate classes/records — never share the same type
- If a Response DTO contains a date field: use `DateTimeOffset` or `string` (ISO 8601) — never `DateTime`

---

## Step 5 — Implement the Service

Apply skills: **`optimizing-ef-core-queries`**, **`date-timezone-handling`**, **`minimal-api-file-upload`** (if file upload is involved)

Create at: `UniClub-Hub.[ModuleName]/Services/[FeatureName]Service.cs`

**Service checklist:**

- [ ] Inject `UniClubDbContext` directly — **never** use the Repository Pattern
- [ ] GET methods: always use `.AsNoTracking()`
- [ ] List queries: use `.Select()` projection to fetch only required fields — avoid loading full entities
- [ ] Eager loading: use `.Include()` or `.AsSplitQuery()` when navigation properties are needed — prevent N+1
- [ ] Server-generated timestamps: use `DateTimeOffset.UtcNow`
- [ ] User-provided timestamps: call `.ToUniversalTime()` before saving — see `date-timezone-handling`
- [ ] If the feature belongs to Operations and changes state → inject `IHubContext<OperationsHub>` and broadcast — see `aspnetcore-signalr-realtime`
- [ ] If the feature involves heavy operations (bulk import, email batch) → use `IBackgroundJobClient` — see `aspnetcore-background-jobs`
- [ ] If file upload is involved → validate magic bytes + use `Guid` filename — see `minimal-api-file-upload`
- [ ] Add `ActivitySource` spans for important business logic — see `configuring-opentelemetry-dotnet`

**Cross-module data access** (if data from another module is needed):

- Query the Shared entity directly via `UniClubDbContext` (read-only, `.AsNoTracking()`)
- **Never** import or instantiate a Service class from another module
- **Never** create a duplicate DTO — reuse from Shared if it exists

---

## Step 6 — Create the Controller

Create at: `UniClub-Hub.Server/Controllers/[ModuleName]/[FeatureName]Controller.cs`

**Thin Controller rules:**

- Controllers handle only HTTP concerns: routing, status codes, authorization
- **No business logic** — delegate everything to the Service
- Use `[Authorize]` attribute for protected endpoints
- Return `ProblemDetails` for errors (ASP.NET Core handles this automatically with `AddProblemDetails()`)
- URL pattern: `[Route("api/v1/[module]/[resource]")]`

```csharp
// Example Controller structure
[ApiController]
[Route("api/v1/operations/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly TaskService _taskService;
    public TasksController(TaskService taskService) => _taskService = taskService;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid activityId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await _taskService.GetByActivityAsync(activityId, page, pageSize, ct));

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateTaskRequest request,
        CancellationToken ct = default)
    {
        var result = await _taskService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }
}
```

---

## Step 7 — Register DI and final review

**7a. Register the Service in the module's DependencyInjection.cs:**

```
UniClub-Hub.[ModuleName]/DependencyInjection.cs
```

```csharp
public static IServiceCollection Add[ModuleName]Module(this IServiceCollection services)
{
    services.AddScoped<[FeatureName]Service>();
    // If a Background Job is involved:
    services.AddScoped<[FeatureName]Job>();
    return services;
}
```

**7b. Final checklist before marking as complete:**

- [ ] Entity is in `UniClub-Hub.Shared/Models/` — not inside a module project
- [ ] Configuration file exists in `UniClub-Hub.Shared/Configurations/`
- [ ] No direct project references between Module projects
- [ ] Migration file was reviewed (Step 3)
- [ ] All date/time fields use `DateTimeOffset` and are stored as UTC
- [ ] Controller contains no business logic
- [ ] Service is registered in `DependencyInjection.cs`
- [ ] No Entity class is exposed directly from any endpoint
- [ ] `TODO.md` updated: related task → `[x] Done`
