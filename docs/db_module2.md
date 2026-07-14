# Database — Module 2: Operations

Tài liệu mô tả các bảng CSDL được module **Operations** sử dụng, dựng lại từ mã nguồn tại
[UniClub-Hub.Operations/Services/Implements/](../UniClub-Hub.Operations/Services/Implements/),
định nghĩa entity trong [UniClub-Hub.Shared/Models/](../UniClub-Hub.Shared/Models/)
và cấu hình EF Core trong [UniClubDbContext.cs](../UniClub-Hub.Shared/Data/UniClubDbContext.cs).

Toàn bộ entity nằm ở project `Shared`; Operations không sở hữu bảng riêng, nó truy cập
`UniClubDbContext` được inject qua constructor.

---

## 1. Tổng quan phạm vi

Các bảng chia làm hai nhóm theo cách Operations sử dụng:

**Nhóm ghi (Operations tạo / sửa / xoá):**
`Tasks`, `TaskAssignees`, `TaskComments`, `TaskAttachments`, `TaskDependencies`,
`Sprints`, `KanbanColumns`, `Events`, `EventSessions`, `EventStaff`,
`EventAttachments`, `EventRegistrations`, `EventCheckInCodes`,
`EventClubAssignments`, `Contributions`, `AuditLogs`.

**Nhóm chỉ đọc (thuộc module Membership, Operations chỉ join/kiểm tra quyền):**
`Clubs`, `Departments`, `ClubMemberships`, `AspNetUsers`.

---

## 2. Bảng nhóm Task

### 2.1. `Tasks` — entity `ClubTask`

Bảng trung tâm của module. Một task luôn thuộc một CLB, có thể gắn thêm sprint, event,
ban (department), task cha, và cột Kanban.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `ClubId` | int | FK → `Clubs`, bắt buộc |
| `ParentId` | int? | FK → `Tasks` (self), dùng cho sub-task |
| `SprintId` | int? | FK → `Sprints` |
| `EventId` | int? | FK → `Events` |
| `DepartmentId` | int? | FK → `Departments`; `null` = task chưa phân ban |
| `Title` | text | bắt buộc |
| `Description` | text? | |
| `Priority` | enum `TaskPriority` | Low / Medium / High, mặc định Medium |
| `Deadline` | timestamptz? | |
| `EstimatedHours` / `ActualHours` | float? | dùng cho tính workload |
| `Status` | enum `ClubTaskStatus` | Todo=0, Doing=1, Done=2, Reviewing=3 |
| `Progress` | int | 0–100 |
| `CompletedAt` | timestamptz? | |
| `AssignedTo` | text? | FK → `AspNetUsers`, người phụ trách chính |
| `StartDate` | timestamptz? | dùng cho Gantt |
| `KanbanColumnId` | int? | FK → `KanbanColumns` |
| `CreatedAt` / `CreatedBy` / `UpdatedAt` / `UpdatedBy` | | `IAuditable`; `CreatedBy` cũng là FK người tạo |
| `IsDeleted` / `DeletedBy` | | `ISoftDeletable` |

Ràng buộc và hành vi:

- **Global query filter** `!IsDeleted` — mọi truy vấn tự động bỏ qua bản ghi đã xoá mềm.
- `AssignedTo` và `CreatedBy` đều FK vào `AspNetUsers` với `OnDelete: SetNull`.
- Index: `(ClubId, Status)` và `(AssignedTo)`.

> Giá trị enum `ClubTaskStatus.Reviewing` được thêm **sau cùng** (=3) để không phá vỡ dữ liệu
> int đã lưu. Thứ tự hiển thị trên Kanban lấy từ `KanbanColumn.SortOrder`, không lấy từ enum.

### 2.2. `TaskAssignees` — entity `TaskAssignee`

Bảng nối nhiều-nhiều cho phép một task có nhiều người thực hiện (song song với
`Tasks.AssignedTo` là người phụ trách chính).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `TaskId` | int | FK → `Tasks`, cascade delete |
| `UserId` | text | FK → `AspNetUsers`, cascade delete |
| `AssignedAt` | timestamp | mặc định UTC now |
| `AssignedBy` | text? | ai giao việc |

Unique index `(TaskId, UserId)` — không giao trùng một người hai lần vào cùng task.

### 2.3. `TaskComments` — entity `TaskComment`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `TaskId` | int | FK → `Tasks` |
| `UserId` | text | FK → `AspNetUsers` |
| `Content` | text | |
| `CreatedAt` | timestamptz | |
| `UpdatedAt` | timestamptz? | |
| `IsEdited` | bool | bật khi bình luận được sửa |

### 2.4. `TaskAttachments` — entity `TaskAttachment`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `TaskId` | int | FK → `Tasks` |
| `UserId` | text | người upload |
| `FileUrl` | text | bắt buộc |
| `FileName` / `ContentType` / `FileSize` | | metadata file |
| `Note` | text? | |
| `UploadedAt` | timestamptz | |
| `IsDeleted` / `DeletedBy` | | `ISoftDeletable` |

### 2.5. `TaskDependencies` — entity `TaskDependency`

Quan hệ phụ thuộc giữa các task, phục vụ Gantt và kiểm tra vòng lặp trong
[TaskIntelligenceService.cs](../UniClub-Hub.Operations/Services/Implements/TaskIntelligenceService.cs).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `TaskId` | int | FK → `Tasks`, cascade delete |
| `DependsOnTaskId` | int | FK → `Tasks`, **restrict** delete |

PK composite `(TaskId, DependsOnTaskId)`. Ngữ nghĩa: `TaskId` chỉ được Done **sau khi**
`DependsOnTaskId` đã Done.

### 2.6. `Sprints` — entity `Sprint`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `ClubId` | int | FK → `Clubs`, cascade delete |
| `EventId` | int? | FK → `Events`, `SetNull`; sprint có thể ở mức CLB hoặc gắn event |
| `DepartmentId` | int? | FK → `Departments` |
| `Name` | text | |
| `Goal` | text? | |
| `StartDate` / `EndDate` | timestamptz | |
| `Status` | enum `SprintStatus` | Planning / Active / Completed / Cancelled |
| `ReviewNotes` | **jsonb** | ghi chú review cuối sprint |
| `CreatedAt` / `CreatedBy` / `UpdatedAt` / `UpdatedBy` | | `IAuditable` |
| `IsDeleted` / `DeletedBy` | | `ISoftDeletable` |

Index `(ClubId, Status)`.

### 2.7. `KanbanColumns` — entity `KanbanColumn`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `ClubId` | int | FK → `Clubs`, cascade delete |
| `SprintId` | int? | FK → `Sprints`, `SetNull`; `null` = cột dùng chung cả CLB |
| `DepartmentId` | int? | FK → `Departments` |
| `Name` | text | |
| `Color` | text? | |
| `SortOrder` | int | thứ tự hiển thị |
| `Status` | enum `ClubTaskStatus` | trạng thái task mà cột này đại diện |
| `IsSystem` | bool | `true` cho 4 cột cố định (Cần làm / Đang làm / Reviewing / Hoàn thành) — không cho đổi tên hay xoá |
| `CreatedAt` / `CreatedBy` / `UpdatedAt` / `UpdatedBy` | | `IAuditable` |

---

## 3. Bảng nhóm Event

### 3.1. `Events` — entity `ClubEvent`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `ClubId` | int? | FK → `Clubs`, **nullable**: `null` = sự kiện cấp Trường |
| `Name` | text | |
| `Description` / `Location` / `BannerUrl` / `Summary` | text? | |
| `StartTime` / `EndTime` | timestamptz? | |
| `MaxParticipants` | int? | trần số người đăng ký |
| `Status` | enum `EventStatus` | Draft / InProgress / Completed / Cancelled |
| `Budget` | decimal? | |
| `Category` | varchar(100)? | |
| `CreatedAt` / `CreatedBy` / `UpdatedAt` / `UpdatedBy` | | `IAuditable` |
| `IsDeleted` / `DeletedBy` | | `ISoftDeletable` |

Có **global query filter** `!IsDeleted`. FK `ClubId` cascade delete khi CLB bị xoá.

### 3.2. `EventSessions` — entity `EventSession`

Lịch trình chi tiết (agenda) trong một sự kiện.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `EventId` | int | FK → `Events`, cascade delete |
| `Title` | varchar(255) | bắt buộc |
| `StartTime` / `EndTime` | varchar(5) | lưu dạng chuỗi `"HH:mm"`, không phải timestamp |
| `Description` | text? | |
| `Location` | varchar(255)? | |
| `SortOrder` | int | |
| `CreatedAt` | timestamp | |

### 3.3. `EventStaff` — entity `EventStaff`

Ban tổ chức của sự kiện.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `EventId` | int | FK → `Events`, cascade delete |
| `UserId` | text | FK → `AspNetUsers`, **restrict** delete |
| `Role` | varchar(50) | mặc định `"Staff"` |
| `AssignedAt` | timestamp | |

Unique index `(EventId, UserId)`.

### 3.4. `EventAttachments` — entity `EventAttachment`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `EventId` | int | FK → `Events`, cascade delete |
| `UploadedBy` | text | FK → `AspNetUsers`, restrict delete |
| `FileUrl` | text | bắt buộc |
| `FileName` / `ContentType` / `FileSize` | | metadata |
| `Note` | text? | |
| `UploadedAt` | timestamptz | |
| `IsDeleted` / `DeletedBy` | | `ISoftDeletable` + query filter `!IsDeleted` |

`EventService` chỉ chấp nhận đuôi `.pdf .doc .docx .xls .xlsx .png .jpg .jpeg .webp .zip .rar`
và giới hạn 20 MB mỗi file.

### 3.5. `EventRegistrations` — entity `EventRegistration`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `EventId` | int | FK → `Events` |
| `UserId` | text | FK → `AspNetUsers` |
| `RegisteredAt` | timestamptz | |
| `Attendance` | enum `AttendanceStatus` | Pending / CheckedIn / Absent |
| `CheckedInAt` | timestamptz? | |
| `Note` | text? | |

Unique index `(EventId, UserId)` — mỗi người chỉ đăng ký một lần cho một sự kiện.

### 3.6. `EventCheckInCodes` — entity `EventCheckInCode`

Mã check-in (QR / one-time code) phát cho từng lượt đăng ký.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `EventRegistrationId` | int | FK → `EventRegistrations`, cascade delete |
| `EventId` | int | FK → `Events`, restrict delete |
| `UserId` | text | FK → `AspNetUsers` |
| `Code` | text | mã sinh ra |
| `CreatedAt` | timestamptz | |

### 3.7. `EventClubAssignments` — entity `EventClubAssignment`

Phiếu giao việc từ sự kiện cấp Trường xuống từng CLB.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `EventId` | int | sự kiện cấp Trường |
| `ClubId` | int | CLB nhận việc |
| `Title` | text | |
| `Description` | text? | |
| `Priority` | enum `TaskPriority` | |
| `Deadline` | timestamptz? | |
| `Status` | text | `Pending` / `InProgress` / `Done` — lưu chuỗi, không phải enum |
| `AttachmentUrlsJson` | text? | mảng JSON: `["url1","url2"]` |
| `CreatedBy` | text | |
| `CreatedAt` | timestamptz | |

Index `(EventId, ClubId)` và `(ClubId)`. Bảng này **không có navigation property** —
FK không được EF cấu hình, quan hệ chỉ mang tính logic.

---

## 4. Bảng hỗ trợ

### 4.1. `Contributions` — entity `Contribution`

Điểm đóng góp được `ContributionAwardService` ghi khi task hoàn thành hoặc thành viên
tham gia sự kiện. Là nguồn dữ liệu cho KPI `ContributionPoints`.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `UserId` | text | FK → `AspNetUsers` |
| `ClubId` | int | FK → `Clubs` |
| `TaskId` | int? | FK → `Tasks` |
| `EventId` | int? | FK → `Events` |
| `ActivityType` | enum `ActivityType` | Task / Event / Post |
| `Points` | int | |
| `Note` | text? | |
| `RecordedAt` | timestamptz | |

### 4.2. `AuditLogs` — entity `AuditLog`

Ghi vết thay đổi, được `UniClubDbContext.SaveChangesAsync` sinh ra và `AuditLogService`
truy vấn lại (join sang `Tasks`, `Events`, `Sprints`, `AspNetUsers` để hiển thị tên thực thể
bị tác động).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `Id` | int | PK |
| `UserId` | text? | ai thực hiện |
| `Action` | enum `AuditAction` | Create / Update / Delete |
| `EntityName` | text | tên bảng, ví dụ `"Tasks"` |
| `EntityId` | text | ID bản ghi bị tác động |
| `OldValue` / `NewValue` | text? | JSON |
| `Timestamp` | timestamp | |

### 4.3. Bảng chỉ đọc

| Bảng | Operations dùng để |
|---|---|
| `Clubs` | lấy tên CLB khi export, kiểm tra CLB tồn tại khi giao việc |
| `Departments` | lọc task/sprint/kanban theo ban, tính KPI theo ban |
| `ClubMemberships` | kiểm tra quyền (`ClubRole`: MEMBER / DEPT_LEAD / CLUB_ADMIN) trước mọi thao tác ghi |
| `AspNetUsers` | hiển thị tên/avatar người giao, người nhận, người bình luận |

---

## 5. Ma trận Service → Bảng

| Service | Bảng truy cập |
|---|---|
| `TaskService` | `Tasks`, `TaskAssignees`, `TaskDependencies`, `KanbanColumns`, `Events`, `ClubMemberships` |
| `TaskAssigneeService` | `TaskAssignees`, `Tasks`, `AspNetUsers` |
| `TaskCommentService` | `TaskComments`, `Tasks`, `TaskAssignees` |
| `TaskAttachmentService` | `TaskAttachments`, `Tasks`, `ClubMemberships` |
| `TaskIntelligenceService` | `Tasks`, `TaskDependencies`, `ClubMemberships`, `AspNetUsers` |
| `SprintService` | `Sprints`, `ClubMemberships` |
| `KanbanColumnService` | `KanbanColumns` |
| `EventService` | `Events`, `EventSessions`, `EventStaff`, `EventAttachments`, `EventRegistrations`, `EventCheckInCodes`, `Tasks`, `ClubMemberships` |
| `EventAssignmentService` | `EventClubAssignments`, `Events`, `Clubs` |
| `ContributionAwardService` | `Contributions`, `Events`, `ClubMemberships` |
| `KpiService` | `Tasks`, `TaskAssignees`, `ClubMemberships`, `Departments`, `AspNetUsers` |
| `AuditLogService` | `AuditLogs`, `Tasks`, `Events`, `Sprints`, `AspNetUsers` |
| `ExportService` | `Tasks`, `Events`, `EventRegistrations`, `Sprints`, `AuditLogs`, `Clubs`, `ClubMemberships`, `AspNetUsers` |

---

## 6. Quy ước chung

- **Xoá mềm**: `Tasks`, `Events`, `Sprints`, `TaskAttachments`, `EventAttachments` cài `ISoftDeletable`.
  `Tasks`, `Events`, `EventAttachments` có global query filter nên không cần lọc `IsDeleted` thủ công;
  `Sprints` và `TaskAttachments` **không có** filter, service phải tự thêm `.Where(x => !x.IsDeleted)`.
- **Audit**: entity cài `IAuditable` được `SaveChangesAsync` tự điền `CreatedAt`/`UpdatedAt` và sinh `AuditLogs`.
- **Enum lưu dưới dạng int** — thêm giá trị mới phải nối vào cuối enum, không chèn giữa.
- Chỉ `Sprint.ReviewNotes` dùng kiểu `jsonb`; trường JSON khác (`EventClubAssignment.AttachmentUrlsJson`)
  lưu dạng text.
