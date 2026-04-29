---
name: ef-core-migrations-postgresql
description: EF Core migration workflow with PostgreSQL for UniClub Hub. Use when
  adding new entities, modifying existing schema, seeding reference data, or rolling
  back migrations. Always follow db-safety rules — propose schema first, never run
  dotnet ef database update directly.
---

# EF Core Migrations — PostgreSQL (UniClub Hub)

## When to Use

- Adding a new Entity to `UniClubHub.Shared/Models/`
- Modifying columns on an existing table (add, rename, change type, add constraint)
- Seeding reference/lookup data (status enums, categories)
- Rolling back a bad migration in development

## When Not to Use

- The change is purely in-memory (DTO, Service logic) — no DB change needed
- The user wants to query optimization only → see `optimizing-ef-core-queries`
- The user wants to add indexes only without schema change → add via `HasIndex()` in existing migration

## Project-Specific Context

- **DbContext**: `UniClubDbContext` in `UniClubHub.Shared/`
- **Migrations folder**: `UniClubHub.Shared/Migrations/`
- **Entities folder**: `UniClubHub.Shared/Models/`
- **Database**: PostgreSQL via Npgsql provider
- **Safety rule**: Never modify files in `UniClubHub.Shared/Models/` without user approval. Never suggest running `dotnet ef database update` — suggest the command only.

---

## Workflow

### Step 1: Define or modify the Entity (requires approval first)

Present the proposed Entity class to the user and wait for explicit confirmation before creating/modifying any file in `UniClubHub.Shared/Models/`.

```csharp
// UniClubHub.Shared/Models/Task.cs
// PROPOSED — awaiting approval before file creation

using System;
using System.Collections.Generic;

namespace UniClubHub.Shared.Models;

public class Task
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Always use DateTimeOffset for timestamps — stores timezone offset,
    // avoids UTC/local ambiguity with PostgreSQL timestamptz column.
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? Deadline { get; set; }

    // Enums: store as string in PostgreSQL for readability and migration safety.
    // Never store as int — adding enum values shifts ordinal values in existing data.
    public string Status { get; set; } = TaskStatus.Todo.ToString();

    // Foreign keys: always nullable if the relationship is optional.
    public Guid ActivityId { get; set; }
    public Guid? AssignedToMemberId { get; set; }

    // Navigation properties
    public Activity Activity { get; set; } = null!;
}

public enum TaskStatus { Todo, Doing, Done, Cancelled }
```

**Entity checklist before proposing:**
- [ ] Primary key is `Guid`, not `int` (consistency across all modules)
- [ ] Timestamps use `DateTimeOffset`, not `DateTime`
- [ ] Enums stored as `string` via `.HasConversion<string>()`
- [ ] Navigation properties marked `null!` (not nullable reference, not `new()`)
- [ ] No service/DTO logic inside the entity class

---

### Step 2: Register the Entity in DbContext

```csharp
// UniClubHub.Shared/UniClubDbContext.cs

public class UniClubDbContext : DbContext
{
    public UniClubDbContext(DbContextOptions<UniClubDbContext> options) : base(options) { }

    // Add new DbSet here
    public DbSet<Task> Tasks => Set<Task>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all IEntityTypeConfiguration<T> classes in this assembly automatically.
        // Add a new configuration file in Shared/Configurations/ for each entity.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(UniClubDbContext).Assembly);
    }
}
```

---

### Step 3: Create the Entity Configuration

Create a separate configuration file — never inline configuration in `OnModelCreating`.

```csharp
// UniClubHub.Shared/Configurations/TaskConfiguration.cs

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace UniClubHub.Shared.Configurations;

public class TaskConfiguration : IEntityTypeConfiguration<Task>
{
    public void Configure(EntityTypeBuilder<Task> builder)
    {
        builder.ToTable("Tasks");  // Explicit table name — PascalCase matches PostgreSQL convention in this project

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedOnAdd();

        builder.Property(t => t.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(t => t.Description)
            .HasMaxLength(2000);

        // Store enum as string, not int
        builder.Property(t => t.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        // Index on foreign key — always index FK columns explicitly in PostgreSQL
        builder.HasIndex(t => t.ActivityId);
        builder.HasIndex(t => t.AssignedToMemberId);

        // Timestamps: map to PostgreSQL timestamptz
        builder.Property(t => t.CreatedAt)
            .HasColumnType("timestamptz")
            .IsRequired();

        builder.Property(t => t.Deadline)
            .HasColumnType("timestamptz");

        // Relationship
        builder.HasOne(t => t.Activity)
            .WithMany(a => a.Tasks)
            .HasForeignKey(t => t.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);  // Choose Cascade vs Restrict explicitly — never rely on default
    }
}
```

---

### Step 4: Generate the Migration

**Naming convention — always use this format:**

```
[Action]_[TableName]_[WhatChanged]

Examples:
  Add_Tasks_InitialSchema
  Alter_Tasks_AddPriorityColumn
  Alter_Members_MakePhoneNullable
  Add_Activities_AddJsonbMetadata
  Seed_SystemCategories
```

**Command to suggest to user (do NOT run this yourself):**

```bash
# Run from solution root
dotnet ef migrations add Add_Tasks_InitialSchema \
  --project UniClubHub.Shared \
  --startup-project UniClubHub.API
```

---

### Step 5: Review the generated Migration file

Always review the generated migration before suggesting the user apply it.
Check for these common PostgreSQL-specific issues:

```csharp
// UniClubHub.Shared/Migrations/20260426_Add_Tasks_InitialSchema.cs

public partial class Add_Tasks_InitialSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Tasks",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                // timestamptz — correct for DateTimeOffset
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                Deadline = table.Column<DateTimeOffset>(type: "timestamptz", nullable: true),
                ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                AssignedToMemberId = table.Column<Guid>(type: "uuid", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Tasks", x => x.Id);
                table.ForeignKey(
                    name: "FK_Tasks_Activities_ActivityId",
                    column: x => x.ActivityId,
                    principalTable: "Activities",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        // Indexes should appear here — verify they were generated
        migrationBuilder.CreateIndex(name: "IX_Tasks_ActivityId", table: "Tasks", column: "ActivityId");
        migrationBuilder.CreateIndex(name: "IX_Tasks_AssignedToMemberId", table: "Tasks", column: "AssignedToMemberId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Down must cleanly reverse Up — verify this exists and is correct
        migrationBuilder.DropTable(name: "Tasks");
    }
}
```

**Migration review checklist:**
- [ ] Column types are PostgreSQL-native (`uuid`, `timestamptz`, `character varying`, `text`, `jsonb`)
- [ ] No `nvarchar` or `datetime2` — those are SQL Server types
- [ ] All FK columns have corresponding `CreateIndex` calls
- [ ] `Down()` method is present and correct
- [ ] No accidental `DropTable` or `DropColumn` on existing tables

---

### Step 6: Apply the Migration (user executes)

Suggest this command — do not run it:

```bash
dotnet ef database update \
  --project UniClubHub.Shared \
  --startup-project UniClubHub.API
```

---

### Step 7: Seeding reference data

Use `HasData()` only for static reference data (lookup tables, system categories).
Do NOT use `HasData()` for user-generated or environment-specific data.

```csharp
// Inside the relevant IEntityTypeConfiguration<T>.Configure() method:

builder.HasData(
    new ActivityCategory { Id = Guid.Parse("..."), Name = "Workshop", CreatedAt = DateTimeOffset.UtcNow },
    new ActivityCategory { Id = Guid.Parse("..."), Name = "Competition", CreatedAt = DateTimeOffset.UtcNow }
);
```

**Rules for seed data:**
- Always use hardcoded `Guid.Parse("...")` — never `Guid.NewGuid()` (changes on every migration regeneration)
- Use `DateTimeOffset.UtcNow` only in migrations that are never re-generated; prefer hardcoded dates for truly static seed data
- Generate the migration after adding `HasData`: `dotnet ef migrations add Seed_ActivityCategories ...`

---

### Rollback a Migration (development only)

```bash
# Roll back to a specific migration by name
dotnet ef database update Add_Tasks_InitialSchema \
  --project UniClubHub.Shared \
  --startup-project UniClubHub.API

# Remove the last migration file (only if NOT yet applied to DB)
dotnet ef migrations remove \
  --project UniClubHub.Shared \
  --startup-project UniClubHub.API
```

**NEVER run rollback on a migration that has already been applied to a shared/staging database.**
**NEVER use `--force` on `migrations remove` if the migration has been applied.**

---

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `DateTime` instead of `DateTimeOffset` | PostgreSQL `timestamp` loses timezone info; bugs when server timezone ≠ UTC | Always use `DateTimeOffset` + `timestamptz` |
| Enum stored as `int` | Adding enum values mid-project shifts ordinals, corrupts existing data | Use `.HasConversion<string>()` |
| `Guid.NewGuid()` in `HasData()` | New GUID generated every time migration is re-scaffolded → EF thinks data changed | Use hardcoded `Guid.Parse("...")` |
| Missing `Down()` method | Can't roll back migration | Always verify `Down()` exists and reverses `Up()` correctly |
| Inline config in `OnModelCreating` | Grows unmanageable; hard for agent to locate config for a specific entity | Always use `IEntityTypeConfiguration<T>` per entity |
| FK without index | Full table scan on every JOIN in PostgreSQL | Always `HasIndex()` on FK columns |
| `nvarchar`/`datetime2` in migration | SQL Server types — EF may generate these if provider not set correctly | Verify Npgsql is the provider; check generated SQL types |
