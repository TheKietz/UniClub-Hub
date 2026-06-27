# UniClub-Hub — Technical Report Context

> Club ERP Management System built as a **Modular Monolith**.
> This document summarizes the technical structure for reporting purposes.

---

## 1. Architecture Overview

**Pattern:** Modular Monolith — a single deployable API process partitioned into
isolated feature modules that share one schema and one database.

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | **React** (TypeScript, Vite) | `uniclub-hub.client/` |
| Backend API | **ASP.NET Core** (.NET, single API host) | `UniClub-Hub.Server/` |
| Persistence | **PostgreSQL** via EF Core (Npgsql) | `timestamptz`, JSONB columns |
| Realtime | **SignalR** | Operations module only (`/hubs/kanban`) |
| Auth | ASP.NET Core Identity + JWT / Refresh tokens | System roles in `AspNetRoles` |

**Project layout (one solution `UniClub-Hub.sln`):**

```
UniClub-Hub.Shared/        → Entities (Models/), Enums, Constants, DbContext, Migrations
UniClub-Hub.Server/        → API host: Controllers/, Hubs/, Program.cs
UniClub-Hub.Membership/    → Module 1: clubs, org structure, members, KPI, RBAC
UniClub-Hub.Operations/    → Module 2: events, tasks, sprints, Kanban/Gantt, realtime
UniClub-Hub.Portal/        → Module 3: public landing page, CMS, registration, SEO
uniclub-hub.client/        → React SPA
```

**Module boundary rules (enforced):**
- All entities live **only** in `UniClub-Hub.Shared/Models/` — never duplicated per module.
- Modules may reference `Shared` only — never each other.
- Cross-module communication goes through Shared DTOs / API contracts.
- API convention: `/api/v1/[module]/[resource]`; responses wrapped in `{ data, message, success }`; errors as `ProblemDetails`.

---

## 2. Core Data Tables — Operations Module (Logical ERD)

> Tables defined as EF entities in `UniClub-Hub.Shared/Models/`.

### Events
| Column | Type | Notes |
|--------|------|-------|
| Id (PK) | int | |
| ClubId (FK) | int? | → Clubs (null = university/school-level) |
| Name, Description, Location, BannerUrl | text | |
| StartTime, EndTime | timestamptz? | |
| MaxParticipants | int? | |
| Status | enum `EventStatus` | Draft, … |
| Budget | decimal? | |
| Category | varchar(100)? | |
| + Audit/SoftDelete | | CreatedAt/By, UpdatedAt/By, IsDeleted |

### Tasks  (`ClubTask`)
| Column | Type | Notes |
|--------|------|-------|
| Id (PK) | int | |
| ClubId (FK) | int | → Clubs |
| **ParentId (FK self)** | int? | → Tasks — subtask breakdown |
| SprintId (FK) | int? | → Sprints |
| EventId (FK) | int? | → Events |
| DepartmentId (FK) | int? | → Departments (Ban-level) |
| Title, Description | text | |
| Priority | enum `TaskPriority` | Medium default |
| Status | enum `ClubTaskStatus` | Todo → … |
| Progress | int | 0–100 |
| Deadline, StartDate, CompletedAt | timestamptz? | |
| EstimatedHours, ActualHours | float? | workload |
| AssignedTo (FK) | string? | → ApplicationUser (primary assignee) |
| KanbanColumnId (FK) | int? | → KanbanColumns |
| + Audit/SoftDelete | | CreatedBy doubles as Creator FK |

### Sprints  (`Sprint`)
| Column | Type | Notes |
|--------|------|-------|
| Id (PK) | int | |
| ClubId (FK) | int | |
| EventId (FK) | int? | null = club-level, else event-scoped |
| DepartmentId (FK) | int? | → Departments |
| Name, Goal | text | |
| StartDate, EndDate | timestamptz | |
| Status | enum `SprintStatus` | Planning default |
| ReviewNotes | text (JSONB) | retrospective |

### TaskDependencies  (`TaskDependency`)
| Column | Type | Notes |
|--------|------|-------|
| TaskId (PK, FK) | int | → Tasks |
| DependsOnTaskId (PK, FK) | int | → Tasks |
| | | Composite PK; `TaskId` must finish after `DependsOnTaskId` (Gantt/blocking) |

### TaskAssignees  (`TaskAssignee`) — many-to-many Task↔User
| Column | Type | Notes |
|--------|------|-------|
| Id (PK) | int | |
| TaskId (FK) | int | → Tasks |
| UserId (FK) | string | → ApplicationUser |
| AssignedAt, AssignedBy | | |

### EventClubAssignments  (`EventClubAssignment`) — "phiếu giao việc" School → Club
| Column | Type | Notes |
|--------|------|-------|
| Id (PK) | int | |
| EventId (FK) | int | → Events |
| ClubId (FK) | int | → Clubs (recipient) |
| Title, Description | text | |
| Priority | enum `TaskPriority` | |
| Deadline | timestamptz? | validated within event window |
| Status | string | Pending / InProgress / Done |
| AttachmentUrlsJson | text (JSON array) | |

### Supporting tables
`KanbanColumn`, `EventStaff`, `EventSession`, `EventRegistration`,
`EventAttachment`, `TaskComment`, `TaskAttachment`, `Contribution`, `MediaGallery`.

### Relationship summary (text ERD)
```
Club 1───* Event 1───* Task *───1 Sprint
Club 1───* Department 1───* Task
Task 1───* Task (ParentId self-ref ........ subtask breakdown)
Task *───* User (via TaskAssignees) + Task *──1 User (AssignedTo)
Task *───* Task (via TaskDependency ......... blocking graph)
Event 1───* EventClubAssignment *───1 Club (school→club hand-off)
Task *───1 KanbanColumn
```

---

## 3. Main API Endpoints

> Convention: Operations module → `/api/v1/operations/...`.
> Membership module currently mounted at `/api/...` (legacy prefix).

### Operations
| Resource | Endpoints |
|----------|-----------|
| **Events** `/api/v1/operations/events` | `GET` list, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`; sub-resources: `/{id}/sessions`, `/{id}/staff`, `/{id}/registrations` (+`/attendance`), `/{id}/attachments` |
| **Tasks** `/api/v1/operations/tasks` | `GET` (filterable, incl. `parentId`), `GET /{id}`, `POST`, `PUT /{id}`, `PATCH /{id}/status`, `DELETE /{id}`; `GET\|POST\|DELETE /{id}/dependencies`, `/{id}/comments`, `/{id}/attachments`; `GET /suggest-assignees`, `GET /urgent-tasks` |
| **Task Assignees** `/api/v1/operations/tasks/{taskId}/assignees` | `GET`, `POST`, `DELETE /{userId}` |
| **Sprints** `/api/v1/operations/sprints` | `GET`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}` |
| **Kanban Columns** `/api/v1/operations/kanban-columns` | `GET`, `POST`, `PUT /{id}`, `DELETE /{id}`, `PATCH /reorder` |
| **Event Assignments (Inbox)** `/api/v1/operations/assignments` | `GET ?eventId=`, `GET /inbox?clubId=` (club inbox), `POST`, `PUT /{id}`, `PATCH /{id}/status`, `DELETE /{id}` |
| **KPI** `/api/v1/operations/kpi` | `GET /me`, `GET /departments/{departmentId}` |
| **Audit Logs** `/api/v1/operations/audit-logs` | `GET` |

### Membership
| Resource | Endpoints |
|----------|-----------|
| **Auth** `/api/auth` | login / register / refresh-token |
| **Users / Me** `/api/users` | `GET /me`, `GET /me/history`, `PATCH /me`, `GET /{userId}/applications`, `GET /{userId}/resignations` |
| **Clubs** `/api/clubs` | `GET`, `GET /{id}`, `GET /{id}/form-schema`, `PUT /{id}/form-schema` |
| **Members** `/api/clubs/{clubId}/members` | membership CRUD, import |
| **Departments** `/api/clubs/{clubId}/departments` | dept CRUD |
| **Positions / Permissions** `/api/clubs/{clubId}/positions`, `/api/club-permissions` | RBAC |
| **Applications** `/api/clubs/{clubId}/applications` | recruitment pipeline |
| **Pipeline** `/api/clubs/{clubId}/pipeline` | recruitment stages |
| **KPI** `/api/clubs/{clubId}/kpi` | club KPI config |
| **Notifications** `/api/notifications`, prefs `/api/membership` | |
| **Support** `/api/support`, **Stats** `/api`, **Uploads** `/api` | |

### Realtime (SignalR — Operations only)
- Hub mapped at **`/hubs/kanban`** (`KanbanHub`).
- Events (constants in `Shared/Constants/SignalREvents.cs`): `TaskStatusUpdated`, `TaskCreated`, `TaskDeleted`.
- Group convention: `club_{clubId}`.

---

## 4. Four-Tier Task Assignment Flow & Subtask Breakdown

The system models a top-down delegation chain:
**Trường (University/School) → CLB (Club) → Ban (Department) → Member.**

| Tier | Mechanism | Entity / Endpoint |
|------|-----------|-------------------|
| **1. Trường → CLB** | A university-level event (`Event.ClubId = null`) organizer issues a *phiếu giao việc* assigning work to a specific club. | `EventClubAssignment` · `POST /assignments` (UniversityEventDetailPage) |
| **2. CLB (inbox)** | The club sees incoming assignments in its inbox and converts them into internal `ClubTask`s scoped to the event. | `GET /assignments/inbox?clubId=` → create `ClubTask` (EventId set) |
| **3. CLB → Ban** | The club lead routes a task to a department by setting `Task.DepartmentId`; department boards show only their slice. | `ClubTask.DepartmentId` (EventDeptTasksBoard) |
| **4. Ban → Member** | The department lead assigns the task to one or more members. | `ClubTask.AssignedTo` (primary) + `TaskAssignees` (multi) |

**Subtask breakdown ("bóc tách việc con"):**
- Implemented via the self-referencing **`ClubTask.ParentId`** → `SubTasks` tree.
- A parent task can be decomposed into child tasks; each child is independently
  assignable, schedulable, and Kanban-tracked.
- The task list API filters by `parentId` and surfaces a `SubTaskCount` per parent
  (aggregated in `TaskService`), letting any tier expand a work item into finer-grained
  child items down the chain.
- **`TaskDependency`** complements this with cross-task blocking (a task may only
  complete after its dependencies are Done) — used for Gantt sequencing.

**Net effect:** work cascades School → Club → Department → Member, while `ParentId`
recursion lets each level slice a received task into smaller owned units, and
`TaskDependency` enforces ordering across the resulting graph.
