# Database Schema Documentation

This document describes the database tables and their relationships based on the entities defined in `UniClub-Hub.Shared\Models`.

> **Conventions used throughout this document:**
>
> - Columns marked ★ are inherited from `IAuditable` (auto-timestamped).
> - Columns marked ✦ are inherited from `ISoftDeletable` (logical delete).
> - `jsonb` columns store free-form JSON; structure noted in description.
> - FK references use format **FK** (_TargetTable_).
> - All `DateTimeOffset` columns are timezone-aware.

---

## 1. Identity & Authentication

### `AspNetUsers` (Extended IdentityUser)

Stores core system users and their personal information.
Implements `ISoftDeletable`.

| Column      | Data Type | Constraints    | Description                       |
| :---------- | :-------- | :------------- | :-------------------------------- |
| **Id**      | string    | **PK**         | System-generated Identity User ID |
| StudentId   | string    | Nullable       | University Student ID             |
| FullName    | string    | Nullable       | User's full name                  |
| Major       | string    | Nullable       | User's academic major             |
| AvatarUrl   | string    | Nullable       | Link to user profile picture      |
| Phone       | string    | Nullable       | Contact number                    |
| Gender      | string    | Nullable       | Gender identity                   |
| DateOfBirth | DateOnly  | Nullable       | Date of birth                     |
| IsDeleted ✦ | bool      | Default: false | Soft-delete flag                  |
| DeletedBy ✦ | string    | Nullable       | User who performed the deletion   |

### `RefreshTokens` _(new)_

Stores JWT refresh tokens for authentication sessions.

| Column    | Data Type | Constraints                    | Description                          |
| :-------- | :-------- | :----------------------------- | :----------------------------------- |
| **Id**    | int       | **PK**                         | Primary Key                          |
| Token     | string    | Not Null                       | The refresh token value              |
| UserId    | string    | **FK** (AspNetUsers), Not Null | Token owner                          |
| ExpiresAt | datetime  | Not Null                       | Expiration timestamp                 |
| CreatedAt | datetime  | Default: UTC Now               | Token creation timestamp             |
| RevokedAt | datetime  | Nullable                       | Revocation timestamp (null = active) |

> **Computed properties (not stored):** `IsExpired`, `IsActive`

---

## 2. Core Club Information

### `Categories`

Defines categories that clubs can belong to (e.g., Academic, Sports, Arts).

| Column      | Data Type | Constraints | Description                |
| :---------- | :-------- | :---------- | :------------------------- |
| **Id**      | int       | **PK**      | Primary Key                |
| Name        | string    | Not Null    | Category Name              |
| Description | string    | Nullable    | Details about the category |

### `Clubs`

Core table storing student club details.
Implements `IAuditable`, `ISoftDeletable`.

| Column          | Data Type | Constraints               | Description                                 |
| :-------------- | :-------- | :------------------------ | :------------------------------------------ |
| **Id**          | int       | **PK**                    | Primary Key                                 |
| Name            | string    | Not Null                  | Club Name                                   |
| Code            | string    | Not Null, Unique          | Unique short code/acronym                   |
| CategoryId      | int       | FK (Categories), Nullable | Reference to Category                       |
| LogoUrl         | string    | Nullable                  | Club logo link                              |
| Description     | string    | Nullable                  | General description                         |
| ContactInfo     | string    | Nullable                  | Contact details                             |
| EstablishedDate | DateOnly  | Nullable                  | Founding date                               |
| Status          | string    | Default: "Active"         | e.g., Active, Inactive                      |
| AdvisorName     | string    | Nullable                  | Name of the club's advisor                  |
| FormSchema      | jsonb     | Nullable                  | Custom JSON structure for recruitment forms |
| CreatedAt ★     | datetime  | Not Null                  | Record creation timestamp                   |
| CreatedBy ★     | string    | Nullable                  | Creator user ID                             |
| UpdatedAt ★     | datetime  | Nullable                  | Last update timestamp                       |
| UpdatedBy ★     | string    | Nullable                  | Last updater user ID                        |
| IsDeleted ✦     | bool      | Default: false            | Soft-delete flag                            |
| DeletedBy ✦     | string    | Nullable                  | User who performed the deletion             |

### `Departments`

Internal departments or teams within a club (e.g., HR, Media, Event).
Implements `IAuditable`, `ISoftDeletable`.

| Column      | Data Type | Constraints              | Description                     |
| :---------- | :-------- | :----------------------- | :------------------------------ |
| **Id**      | int       | **PK**                   | Primary Key                     |
| ClubId      | int       | **FK** (Clubs), Not Null | Reference to the Club           |
| Name        | string    | Not Null                 | Department Name                 |
| Description | string    | Nullable                 | Details of the department       |
| CreatedAt ★ | datetime  | Not Null                 | Record creation timestamp       |
| CreatedBy ★ | string    | Nullable                 | Creator user ID                 |
| UpdatedAt ★ | datetime  | Nullable                 | Last update timestamp           |
| UpdatedBy ★ | string    | Nullable                 | Last updater user ID            |
| IsDeleted ✦ | bool      | Default: false           | Soft-delete flag                |
| DeletedBy ✦ | string    | Nullable                 | User who performed the deletion |

### `LandingPages`

Dynamic CMS-driven public landing pages for clubs.

| Column         | Data Type | Constraints            | Description                           |
| :------------- | :-------- | :--------------------- | :------------------------------------ |
| **Id**         | int       | **PK**                 | Primary Key                           |
| ClubId         | int       | **FK** (Clubs), Unique | 1-to-1 relationship with Club         |
| HeroImage      | string    | Nullable               | Main banner image                     |
| Introduction   | string    | Nullable               | Intro text                            |
| Mission        | string    | Nullable               | Club Mission                          |
| Vision         | string    | Nullable               | Club Vision                           |
| SocialLinks    | jsonb     | Nullable               | JSON structure for social media links |
| LayoutSettings | jsonb     | Nullable               | JSON structure for page UI layout     |

---

## 3. Memberships & Recruitment

### `Applications` (Table: `Applications`)

Stores user applications to join a club.

| Column    | Data Type | Constraints                    | Description                               |
| :-------- | :-------- | :----------------------------- | :---------------------------------------- |
| **Id**    | int       | **PK**                         | Primary Key                               |
| UserId    | string    | **FK** (AspNetUsers), Not Null | Applicant                                 |
| ClubId    | int       | **FK** (Clubs), Not Null       | Target Club                               |
| Answers   | jsonb     | Nullable                       | JSON structure of answers to `FormSchema` |
| Status    | string    | Default: "Pending"             | Pending / Interview / Accepted / Rejected |
| AppliedAt | datetime  | Default: UTC Now               | Application timestamp                     |

### `ClubMemberships`

Stores active or past memberships inside clubs, along with their roles.

| Column       | Data Type | Constraints                    | Description                                   |
| :----------- | :-------- | :----------------------------- | :-------------------------------------------- |
| **Id**       | int       | **PK**                         | Primary Key                                   |
| UserId       | string    | **FK** (AspNetUsers), Not Null | Member                                        |
| ClubId       | int       | **FK** (Clubs), Not Null       | Club                                          |
| DepartmentId | int       | FK (Departments), Nullable     | Assigned department                           |
| ClubRole     | string    | Default: "MEMBER"              | CLUB_ADMIN / DEPT_LEAD / DEPT_DEPUTY / MEMBER |
| JoinedDate   | DateOnly  | Not Null                       | Date joined                                   |
| Status       | string    | Default: "Active"              | Active / Resigned                             |

---

## 4. Internal Operations, Events & Sprints

### `Events` (Table: `Events`)

Club-hosted events.
Implements `IAuditable`, `ISoftDeletable`.

| Column          | Data Type      | Constraints              | Description                                |
| :-------------- | :------------- | :----------------------- | :----------------------------------------- |
| **Id**          | int            | **PK**                   | Primary Key                                |
| ClubId          | int            | **FK** (Clubs), Not Null | Hosting Club                               |
| Name            | string         | Not Null                 | Event title                                |
| Description     | string         | Nullable                 | Event details                              |
| Location        | string         | Nullable                 | Physical or virtual location               |
| BannerUrl       | string         | Nullable                 | Event banner/cover image                   |
| StartTime       | DateTimeOffset | Nullable                 | Scheduled start (TZ-aware)                 |
| EndTime         | DateTimeOffset | Nullable                 | Scheduled end (TZ-aware)                   |
| MaxParticipants | int            | Nullable                 | Capacity limit                             |
| Status          | string         | Default: "Draft"         | Draft / InProgress / Completed / Cancelled |
| CreatedAt ★     | datetime       | Not Null                 | Record creation timestamp                  |
| CreatedBy ★     | string         | Nullable                 | Creator user ID                            |
| UpdatedAt ★     | datetime       | Nullable                 | Last update timestamp                      |
| UpdatedBy ★     | string         | Nullable                 | Last updater user ID                       |
| IsDeleted ✦     | bool           | Default: false           | Soft-delete flag                           |
| DeletedBy ✦     | string         | Nullable                 | User who performed the deletion            |

### `EventRegistrations`

Records of users registering for events.

| Column       | Data Type      | Constraints                    | Description                       |
| :----------- | :------------- | :----------------------------- | :-------------------------------- |
| **Id**       | int            | **PK**                         | Primary Key                       |
| EventId      | int            | **FK** (Events), Not Null      | Target Event                      |
| UserId       | string         | **FK** (AspNetUsers), Not Null | Participant                       |
| RegisteredAt | DateTimeOffset | Default: UTC Now               | Registration timestamp (TZ-aware) |
| Attendance   | string         | Default: "Pending"             | Pending / CheckedIn / Absent      |
| CheckedInAt  | DateTimeOffset | Nullable                       | Actual check-in timestamp         |
| Note         | string         | Nullable                       | Additional remarks                |

### `Sprints` _(new)_

Agile sprint containers for grouping tasks within a time-box.
Implements `IAuditable`.

| Column      | Data Type      | Constraints              | Description                               |
| :---------- | :------------- | :----------------------- | :---------------------------------------- |
| **Id**      | int            | **PK**                   | Primary Key                               |
| ClubId      | int            | **FK** (Clubs), Not Null | Owning Club                               |
| EventId     | int            | FK (Events), Nullable    | Optional event scope (null = club-level)  |
| Name        | string         | Not Null                 | Sprint name (e.g., "Sprint 3")            |
| Goal        | string         | Nullable                 | Sprint goal / objective                   |
| StartDate   | DateTimeOffset | Not Null                 | Sprint start date (TZ-aware)              |
| EndDate     | DateTimeOffset | Not Null                 | Sprint end date (TZ-aware)                |
| Status      | string         | Default: "Planning"      | Planning / Active / Completed / Cancelled |
| ReviewNotes | jsonb          | Nullable                 | Sprint retrospective notes                |
| CreatedAt ★ | datetime       | Not Null                 | Record creation timestamp                 |
| CreatedBy ★ | string         | Nullable                 | Creator user ID                           |
| UpdatedAt ★ | datetime       | Nullable                 | Last update timestamp                     |
| UpdatedBy ★ | string         | Nullable                 | Last updater user ID                      |

### `Tasks` (Table: `Tasks`)

Kanban tasks for club operations. Supports sub-tasks (self-referencing) and sprint assignment.
Implements `IAuditable`, `ISoftDeletable`.

| Column         | Data Type      | Constraints                | Description                          |
| :------------- | :------------- | :------------------------- | :----------------------------------- |
| **Id**         | int            | **PK**                     | Primary Key                          |
| ClubId         | int            | **FK** (Clubs), Not Null   | Parent Club                          |
| ParentId       | int            | FK (Tasks), Nullable       | Parent task (for sub-tasks)          |
| SprintId       | int            | FK (Sprints), Nullable     | Assigned Sprint                      |
| EventId        | int            | FK (Events), Nullable      | Associated Event (if any)            |
| DepartmentId   | int            | FK (Departments), Nullable | Assigned to Department               |
| Title          | string         | Not Null                   | Task title                           |
| Description    | string         | Nullable                   | Task details                         |
| Priority       | string         | Default: "Medium"          | Low / Medium / High                  |
| Deadline       | DateTimeOffset | Nullable                   | Due date (TZ-aware)                  |
| EstimatedHours | float          | Nullable                   | Planned effort in hours              |
| ActualHours    | float          | Nullable                   | Actual effort spent in hours         |
| Status         | string         | Default: "Todo"            | Todo / Doing / Done                  |
| Progress       | int            | Default: 0                 | Completion % (0–100)                 |
| CompletedAt    | DateTimeOffset | Nullable                   | Timestamp when marked Done           |
| AssignedTo     | string         | FK (AspNetUsers), Nullable | Assignee                             |
| CreatedAt ★    | datetime       | Not Null                   | Record creation timestamp            |
| CreatedBy ★    | string         | Nullable                   | Task creator (doubles as Creator FK) |
| UpdatedAt ★    | datetime       | Nullable                   | Last update timestamp                |
| UpdatedBy ★    | string         | Nullable                   | Last updater user ID                 |
| IsDeleted ✦    | bool           | Default: false             | Soft-delete flag                     |
| DeletedBy ✦    | string         | Nullable                   | User who performed the deletion      |

### `TaskDependencies` _(new)_

Many-to-many join table defining task execution order.
Composite primary key: (`TaskId`, `DependsOnTaskId`).

| Column              | Data Type | Constraints            | Description           |
| :------------------ | :-------- | :--------------------- | :-------------------- |
| **TaskId**          | int       | **PK**, **FK** (Tasks) | The dependent task    |
| **DependsOnTaskId** | int       | **PK**, **FK** (Tasks) | The prerequisite task |

> **Rule:** `TaskId` can only be marked Done after `DependsOnTaskId` is Done.

### `TaskAttachments`

Files and notes attached to tasks.

| Column      | Data Type      | Constraints                    | Description                         |
| :---------- | :------------- | :----------------------------- | :---------------------------------- |
| **Id**      | int            | **PK**                         | Primary Key                         |
| TaskId      | int            | **FK** (Tasks), Not Null       | Target Task                         |
| UserId      | string         | **FK** (AspNetUsers), Not Null | Uploader                            |
| FileUrl     | string         | Not Null                       | Link to file                        |
| FileName    | string         | Nullable                       | Original file name                  |
| ContentType | string         | Nullable                       | MIME type (e.g., "application/pdf") |
| FileSize    | long           | Nullable                       | File size in bytes                  |
| Note        | string         | Nullable                       | Additional remarks                  |
| UploadedAt  | DateTimeOffset | Default: UTC Now               | Timestamp (TZ-aware)                |

### `TaskComments` _(new)_

Discussion thread on individual tasks.

| Column    | Data Type      | Constraints                    | Description                         |
| :-------- | :------------- | :----------------------------- | :---------------------------------- |
| **Id**    | int            | **PK**                         | Primary Key                         |
| TaskId    | int            | **FK** (Tasks), Not Null       | Target Task                         |
| UserId    | string         | **FK** (AspNetUsers), Not Null | Comment author                      |
| Content   | string         | Not Null                       | Comment body                        |
| CreatedAt | DateTimeOffset | Default: UTC Now               | Timestamp (TZ-aware)                |
| UpdatedAt | DateTimeOffset | Nullable                       | Last edit timestamp                 |
| IsEdited  | bool           | Default: false                 | Whether the comment has been edited |

---

## 5. Media & Communication

### `Posts`

News and announcements posted by clubs.

| Column       | Data Type | Constraints                    | Description           |
| :----------- | :-------- | :----------------------------- | :-------------------- |
| **Id**       | int       | **PK**                         | Primary Key           |
| ClubId       | int       | **FK** (Clubs), Not Null       | Publishing Club       |
| AuthorId     | string    | **FK** (AspNetUsers), Not Null | Author                |
| DepartmentId | int       | FK (Departments), Nullable     | Associated department |
| Title        | string    | Not Null                       | Post Title            |
| Content      | string    | Not Null                       | HTML/Markdown content |
| ThumbnailUrl | string    | Nullable                       | Cover image           |
| Category     | string    | Default: "News"                | News / Announcement   |
| IsPublished  | bool      | Default: false                 | Visibility status     |
| CreatedAt    | datetime  | Default: UTC Now               | Publication timestamp |

### `MediaGalleries`

Images and videos associated with clubs or events.

| Column      | Data Type | Constraints              | Description      |
| :---------- | :-------- | :----------------------- | :--------------- |
| **Id**      | int       | **PK**                   | Primary Key      |
| ClubId      | int       | **FK** (Clubs), Not Null | Owning Club      |
| EventId     | int       | FK (Events), Nullable    | Associated Event |
| MediaUrl    | string    | Not Null                 | Link to asset    |
| MediaType   | string    | Default: "Image"         | Image / Video    |
| Description | string    | Nullable                 | Caption          |

### `Notifications`

System alerts and messages for users.

| Column    | Data Type | Constraints                    | Description                         |
| :-------- | :-------- | :----------------------------- | :---------------------------------- |
| **Id**    | int       | **PK**                         | Primary Key                         |
| UserId    | string    | **FK** (AspNetUsers), Not Null | Recipient                           |
| Title     | string    | Not Null                       | Notification title                  |
| Message   | string    | Not Null                       | Notification body                   |
| Type      | string    | Default: "System"              | Task / Event / Application / System |
| IsRead    | bool      | Default: false                 | Read status                         |
| CreatedAt | datetime  | Default: UTC Now               | Timestamp                           |

---

## 6. Gamification

### `Contributions`

Points and history of members contributing to club activities.

| Column       | Data Type      | Constraints                    | Description                  |
| :----------- | :------------- | :----------------------------- | :--------------------------- |
| **Id**       | int            | **PK**                         | Primary Key                  |
| UserId       | string         | **FK** (AspNetUsers), Not Null | Member earning points        |
| ClubId       | int            | **FK** (Clubs), Not Null       | Target Club                  |
| TaskId       | int            | FK (Tasks), Nullable           | Task completed               |
| EventId      | int            | FK (Events), Nullable          | Event attended/organized     |
| ActivityType | string         | Not Null                       | Task / Event / Post          |
| Points       | int            | Not Null                       | Points awarded               |
| Note         | string         | Nullable                       | Context or reason for points |
| RecordedAt   | DateTimeOffset | Default: UTC Now               | Timestamp (TZ-aware)         |

---

## 7. System & Auditing

### `AuditLogs` _(new)_

Tracks all create/update/delete operations across the system for accountability.

| Column     | Data Type | Constraints      | Description                    |
| :--------- | :-------- | :--------------- | :----------------------------- |
| **Id**     | int       | **PK**           | Primary Key                    |
| UserId     | string    | Nullable         | Who performed the action       |
| Action     | string    | Not Null         | Create / Update / Delete       |
| EntityName | string    | Not Null         | Table name (e.g., "Tasks")     |
| EntityId   | string    | Not Null         | ID of the affected record      |
| OldValue   | jsonb     | Nullable         | Previous state (JSON snapshot) |
| NewValue   | jsonb     | Nullable         | New state (JSON snapshot)      |
| Timestamp  | datetime  | Default: UTC Now | When the action occurred       |

---

## Appendix A: Shared Interfaces

These interfaces are defined in `UniClub-Hub.Shared\Common` and auto-populated by the `DbContext` save interceptor.

### `IAuditable`

| Property  | Type      | Description                   |
| :-------- | :-------- | :---------------------------- |
| CreatedAt | DateTime  | Set once on insert            |
| CreatedBy | string?   | User ID of the creator        |
| UpdatedAt | DateTime? | Updated on every modification |
| UpdatedBy | string?   | User ID of last modifier      |

### `ISoftDeletable`

| Property  | Type    | Description                    |
| :-------- | :------ | :----------------------------- |
| IsDeleted | bool    | `true` = logically deleted     |
| DeletedBy | string? | User ID who deleted the record |

---

## Appendix B: Entity Relationship Summary

```
AspNetUsers ──┬── 1:N ── ClubMemberships
              ├── 1:N ── Notifications
              ├── 1:N ── RefreshTokens
              ├── 1:N ── Applications (as Applicant)
              ├── 1:N ── Posts (as Author)
              ├── 1:N ── Tasks (as Assignee / Creator)
              ├── 1:N ── TaskAttachments (as Uploader)
              ├── 1:N ── TaskComments (as Author)
              ├── 1:N ── EventRegistrations (as Participant)
              └── 1:N ── Contributions (as Contributor)

Categories ── 1:N ── Clubs

Clubs ────────┬── 1:1 ── LandingPages
              ├── 1:N ── Departments
              ├── 1:N ── ClubMemberships
              ├── 1:N ── Applications
              ├── 1:N ── Posts
              ├── 1:N ── Events
              ├── 1:N ── Sprints
              ├── 1:N ── Contributions
              └── 1:N ── MediaGalleries

Departments ──┬── 1:N ── ClubMemberships
              ├── 1:N ── Tasks
              └── 1:N ── Posts

Events ───────┬── 1:N ── EventRegistrations
              ├── 1:N ── Tasks
              ├── 1:N ── Sprints
              ├── 1:N ── MediaGalleries
              └── 1:N ── Contributions

Sprints ────── 1:N ── Tasks

Tasks ────────┬── 1:N ── Tasks (self-ref: SubTasks ↔ Parent)
              ├── 1:N ── TaskAttachments
              ├── 1:N ── TaskComments
              ├── 1:N ── Contributions
              └── N:M ── TaskDependencies (composite PK join)
```

---

_Last updated: 2026-05-10 — Generated from 20 entity files in `UniClub-Hub.Shared\Models\`._
