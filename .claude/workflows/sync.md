---
description: The Agent scans the entire codebase, cross-references with TODO.md, and reports the actual current state of the project. Use at the start of a new session or after a working session to quickly understand where things stand.
---

# Workflow: /sync

---

## Steps:

### 1. Read TODO.md

Read `TODO.md` at the solution root to get the task list and current statuses.
If the file does not exist: notify the user and skip the cross-reference steps.

### 2. Scan Backend — Shared Project

Inspect `UniClub-Hub.Shared/`:

- `Models/` → list all existing Entities
- `Configurations/` → check which Entities have a Configuration file and which are missing one
- `Migrations/` → list the most recent migration (name + date)
- `UniClubDbContext.cs` → cross-reference `DbSet` registrations against the Entity list in `Models/` — identify any Entity not yet registered

### 3. Scan Backend — Module Projects

For each module (`Membership`, `Operations`, `Portal`):

- `Services/` → list implemented Services
- `DTOs/` → list existing DTOs
- `DependencyInjection.cs` → cross-reference Services registered here against files in `Services/` — identify any Service not registered in DI
- `Hubs/` (Operations only) → check whether the Hub exists

### 4. Scan Backend — Controllers

Inspect `UniClub-Hub.Server/Controllers/`:

- List existing Controllers grouped by module
- For each Controller: list its endpoints (HTTP method + route)
- Cross-reference against existing Services — identify any Service that has no corresponding Controller

### 5. Scan Frontend

Inspect `src/features/`:

- List existing feature folders by module
- `api/` → list API function files
- `hooks/` → list custom hooks
- `components/` → list main components
- `schemas/` → list form schemas (if any)
- `src/lib/api/queryKeys.ts` → cross-reference keys against existing API hooks
- `src/constants/signalREvents.ts` → check it exists (Operations module only)

### 6. Quick rule-violation check

Only report violations if found — no need to scan exhaustively:

- [ ] Any Entity file located outside `UniClub-Hub.Shared/Models/`?
- [ ] Any `DbSet` in `UniClubDbContext` with no matching Configuration file?
- [ ] Any Service file not registered in `DependencyInjection.cs`?
- [ ] Any Controller directly importing from another module project?

### 7. Report

Present the summary in this format — concise, no filler:

---

```
Hi [user], here is the current state of the project:

✅ Completed:
  - [Entity/Feature with full stack: DB → Controller → Frontend]

🔄 In progress (from TODO.md):
  - [Tasks currently in Doing status]

⚠️ Gaps found:
  - Entity [X] exists in Models/ but has no Configuration file
  - Service [Y] is not registered in DependencyInjection.cs
  - [Other issues if any]

📋 Not started yet:
  - [Tasks in Todo status]

What would you like to work on next?
  A) Backend: [suggested next feature]
  B) Frontend: [suggested next feature]
  C) Fix gap: [most critical gap]
```

---

**Note**: If `TODO.md` does not exist, base the report on the codebase scan and end with:
_"TODO.md was not found — would you like me to create it based on what I see?"_
