---
description: Guide the Agent to safely apply schema changes to a database that already contains data. Use when: adding a column, changing a data type, adding an index, adding a new table, or seeding data into an existing table. Do NOT use for a brand-new schema —
---

# Workflow: /db-change [Description]

> **Examples**:
> `/db-change Add priority column to Tasks`
> `/db-change Add index on Activities.StartDate`
> `/db-change Seed default ActivityCategories`

---

## Step 0 — Classify the change

Identify the change type before doing anything:

| Type               | Examples                                      | Risk                      |
| ------------------ | --------------------------------------------- | ------------------------- |
| **Additive**       | Add nullable column, add index, add new table | Low                       |
| **Destructive**    | Drop column, rename column, change data type  | **High — must warn user** |
| **Data migration** | Seed data, backfill existing rows             | Medium                    |

If the change is **Destructive**: explicitly tell the user that data may be affected before proceeding.
Wait for clear confirmation before proposing any file changes.

---

## Step 1 — Propose the change (STOP, await approval)

Apply: **`db-safety`** rule + **`ef-core-migrations-postgresql`**

Present in chat — **do not create or modify any file**:

**For an Additive change:**

```
Proposal: Add column `Priority` (string, nullable, default "Medium") to the Tasks table
Reason: [feature requirement]
Impact: No effect on existing data
Configuration change: Add HasMaxLength(50) + HasDefaultValue("Medium")
```

**For a Destructive change:**

```
⚠️ WARNING: This change may affect existing data.
Proposal: Rename column `DueDate` → `Deadline`
Data impact: All existing values in DueDate will be migrated to Deadline
Rollback: The Down() migration will rename back — no data loss if rolled back immediately
Do you confirm you want to proceed?
```

---

## Step 2 — Modify the Entity and Configuration

Only proceed after the user confirms in Step 1.

**Never create an Entity inside a module project** — only modify files in `UniClub-Hub.Shared/Models/`
**Never inline config** — modify the file in `UniClub-Hub.Shared/Configurations/`

Checklist per change type:

**Adding a column:**

- [ ] If the table already has data → the column must be nullable OR have `HasDefaultValue()`
- [ ] If it is a new timestamp → use `DateTimeOffset?` with `HasColumnType("timestamptz")`
- [ ] Add `HasIndex()` if the column will be used for filtering or sorting

**Renaming a column:**

- [ ] Use `migrationBuilder.RenameColumn()` in the migration — never Drop + Add (causes data loss)
- [ ] Update all query references in Services that use the old column name

**Changing a data type:**

- [ ] Write a data migration script to convert existing data before changing the type
- [ ] Test on a copy of the data before applying to production

**Adding an index:**

- [ ] Determine whether the index should be unique
- [ ] For composite indexes: determine column order (most selective column first)

---

## Step 3 — Create the Migration

Apply: **`ef-core-migrations-postgresql`** (Steps 4–5)

Name the migration to accurately describe the change:

```bash
# Adding a column:
dotnet ef migrations add Alter_Tasks_AddPriorityColumn \
  --project UniClub-Hub.Shared --startup-project UniClub-Hub.Server

# Adding an index:
dotnet ef migrations add Alter_Activities_AddStartDateIndex \
  --project UniClub-Hub.Shared --startup-project UniClub-Hub.Server

# Seeding data:
dotnet ef migrations add Seed_DefaultActivityCategories \
  --project UniClub-Hub.Shared --startup-project UniClub-Hub.Server
```

**Do not run this yourself** — suggest the command for the user to execute.

---

## Step 4 — Review the generated Migration file (required)

After the user runs the `migrations add` command, **review the generated file before it is applied**:

**For an Additive change:**

- [ ] Only `AddColumn` / `CreateIndex` operations — no unintended `DropColumn` or `DropTable`
- [ ] New nullable column has `nullable: true`
- [ ] Default value is correctly set

**For a Destructive change:**

- [ ] `RenameColumn` is used (not Drop + Add)
- [ ] `Down()` method correctly reverses the change
- [ ] No data loss occurs in `Up()`

**For Seed data:**

- [ ] `InsertData` uses hardcoded `Guid.Parse()` — never `Guid.NewGuid()`
- [ ] Timestamps are hardcoded values — never `DateTimeOffset.UtcNow` inside a migration

If any issue is found during review → run `dotnet ef migrations remove` before making corrections.

---

## Step 5 — Update Service queries (if needed)

If a new column was added:

- [ ] Update `.Select()` projections in relevant Service methods
- [ ] Update the Response DTO if the column needs to be exposed via the API
- [ ] Update the Request DTO if the column can be set by the user

If an index was added:

- [ ] Verify that the relevant Service query filters on the indexed column (so the index is actually used)

---

## Step 6 — Apply and verify

Suggest the apply command — do not run it:

```bash
dotnet ef database update \
  --project UniClub-Hub.Shared \
  --startup-project UniClub-Hub.Server
```

After applying, suggest the user verify:

- Inspect the column in a DB tool (DBeaver, pgAdmin, or `\d tablename` in psql)
- Run the related query via Swagger or Postman to confirm data is correct

---

## Final checklist

- [ ] Destructive changes were warned about and explicitly confirmed by the user
- [ ] Only files in `UniClub-Hub.Shared/` were modified — no Entity changes inside module projects
- [ ] Migration file was reviewed before applying
- [ ] New columns on tables with existing data are nullable or have a default value
- [ ] Seed data uses hardcoded GUIDs — never `Guid.NewGuid()`
- [ ] `TODO.md` updated
