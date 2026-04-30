# Database Schema Documentation

This document describes the database tables and their relationships based on the entities defined in `UniClub-Hub.Shared\Models`.

---

## 1. Identity & Users

### `AspNetUsers` (Extended IdentityUser)
Stores core system users and their personal information.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | string | **PK** | System-generated Identity User ID |
| StudentId | string | Nullable | University Student ID |
| FullName | string | Nullable | User's full name |
| Major | string | Nullable | User's academic major |
| AvatarUrl | string | Nullable | Link to user profile picture |
| Phone | string | Nullable | Contact number |

---

## 2. Core Club Information

### `Categories`
Defines categories that clubs can belong to (e.g., Academic, Sports, Arts).

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| Name | string | Not Null | Category Name |
| Description | string | Nullable | Details about the category |

### `Clubs`
Core table storing student club details.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| Name | string | Not Null | Club Name |
| Code | string | Not Null, Unique | Unique short code/acronym |
| CategoryId | int | FK (Categories), Nullable | Reference to Category |
| LogoUrl | string | Nullable | Club logo link |
| Description | string | Nullable | General description |
| ContactInfo | string | Nullable | Contact details |
| EstablishedDate | date | Nullable | Founding date |
| Status | string | Default: "Active" | e.g., Active, Inactive |
| AdvisorName | string | Nullable | Name of the club's advisor |
| FormSchema | jsonb | Nullable | Custom JSON structure for recruitment forms |

### `Departments`
Internal departments or teams within a club (e.g., HR, Media, Event).

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| ClubId | int | **FK** (Clubs), Not Null | Reference to the Club |
| Name | string | Not Null | Department Name |
| Description | string | Nullable | Details of the department |

### `LandingPages`
Dynamic CMS-driven public landing pages for clubs.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| ClubId | int | **FK** (Clubs), Unique | 1-to-1 relationship with Club |
| HeroImage | string | Nullable | Main banner image |
| Introduction | string | Nullable | Intro text |
| Mission | string | Nullable | Club Mission |
| Vision | string | Nullable | Club Vision |
| SocialLinks | jsonb | Nullable | JSON structure for social media links |
| LayoutSettings | jsonb | Nullable | JSON structure for page UI layout |

---

## 3. Memberships & Recruitment

### `Applications` (Table: `Applications`)
Stores user applications to join a club.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| UserId | string | **FK** (AspNetUsers), Not Null| Applicant |
| ClubId | int | **FK** (Clubs), Not Null | Target Club |
| Answers | jsonb | Nullable | JSON structure of answers to `FormSchema` |
| Status | string | Default: "Pending" | Pending / Interview / Accepted / Rejected |
| AppliedAt | datetime | Default: UTC Now | Application timestamp |

### `ClubMemberships`
Stores active or past memberships inside clubs, along with their roles.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| UserId | string | **FK** (AspNetUsers), Not Null| Member |
| ClubId | int | **FK** (Clubs), Not Null | Club |
| DepartmentId | int | FK (Departments), Nullable | Assigned department |
| ClubRole | string | Default: "MEMBER" | CLUB_ADMIN / DEPT_LEAD / DEPT_DEPUTY / MEMBER |
| JoinedDate | date | Not Null | Date joined |
| Status | string | Default: "Active" | Active / Resigned |

---

## 4. Internal Operations & Events

### `Events` (Table: `Events`)
Club-hosted events.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| ClubId | int | **FK** (Clubs), Not Null | Hosting Club |
| Name | string | Not Null | Event title |
| Description | string | Nullable | Event details |
| Location | string | Nullable | Physical or virtual location |
| StartTime | datetime | Nullable | Scheduled start |
| EndTime | datetime | Nullable | Scheduled end |
| MaxParticipants | int | Nullable | Capacity limit |
| Status | string | Default: "Draft" | Draft / Published / Completed / Cancelled |

### `EventRegistrations`
Records of users registering for events.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| EventId | int | **FK** (Events), Not Null | Target Event |
| UserId | string | **FK** (AspNetUsers), Not Null| Participant |
| RegisteredAt | datetime | Default: UTC Now | Registration timestamp |
| Attendance | string | Default: "Pending" | Pending / CheckedIn / Absent |

### `Tasks` (Table: `Tasks`)
Kanban tasks for club operations.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| ClubId | int | **FK** (Clubs), Not Null | Parent Club |
| EventId | int | FK (Events), Nullable | Associated Event (if any) |
| DepartmentId | int | FK (Departments), Nullable | Assigned to Department |
| Title | string | Not Null | Task title |
| Description | string | Nullable | Task details |
| Priority | string | Default: "Medium" | Low / Medium / High |
| Deadline | datetime | Nullable | Due date |
| Status | string | Default: "Todo" | Todo / Doing / Done |
| Progress | int | Default: 0 | Completion % (0-100) |
| AssignedTo | string | FK (AspNetUsers), Nullable | Assignee |
| CreatedBy | string | FK (AspNetUsers), Nullable | Task creator |

### `TaskAttachments`
Files and notes attached to tasks.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| TaskId | int | **FK** (Tasks), Not Null | Target Task |
| UserId | string | **FK** (AspNetUsers), Not Null| Uploader |
| FileUrl | string | Not Null | Link to file |
| FileName | string | Nullable | Original file name |
| Note | string | Nullable | Additional remarks |
| UploadedAt | datetime | Default: UTC Now | Timestamp |

---

## 5. Media & Communication

### `Posts`
News and announcements posted by clubs.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| ClubId | int | **FK** (Clubs), Not Null | Publishing Club |
| AuthorId | string | **FK** (AspNetUsers), Not Null| Author |
| DepartmentId | int | FK (Departments), Nullable | Associated department |
| Title | string | Not Null | Post Title |
| Content | string | Not Null | HTML/Markdown content |
| ThumbnailUrl | string | Nullable | Cover image |
| Category | string | Default: "News" | News / Announcement |
| IsPublished | bool | Default: false | Visibility status |
| CreatedAt | datetime | Default: UTC Now | Publication timestamp |

### `MediaGalleries`
Images and videos associated with clubs or events.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| ClubId | int | **FK** (Clubs), Not Null | Owning Club |
| EventId | int | FK (Events), Nullable | Associated Event |
| MediaUrl | string | Not Null | Link to asset |
| MediaType | string | Default: "Image" | Image / Video |
| Description | string | Nullable | Caption |

### `Notifications`
System alerts and messages for users.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| UserId | string | **FK** (AspNetUsers), Not Null| Recipient |
| Title | string | Not Null | Notification title |
| Message | string | Not Null | Notification body |
| Type | string | Default: "System" | Task / Event / Application / System |
| IsRead | bool | Default: false | Read status |
| CreatedAt | datetime | Default: UTC Now | Timestamp |

---

## 6. Gamification

### `Contributions`
Points and history of members contributing to club activities.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Id** | int | **PK** | Primary Key |
| UserId | string | **FK** (AspNetUsers), Not Null| Member earning points |
| ClubId | int | **FK** (Clubs), Not Null | Target Club |
| TaskId | int | FK (Tasks), Nullable | Task completed |
| EventId | int | FK (Events), Nullable | Event attended/organized |
| ActivityType | string | Not Null | Task / Event / Post |
| Points | int | Not Null | Points awarded |
| RecordedAt | datetime | Default: UTC Now | Timestamp |
