# Database — UniClub-Hub

> Entity, quan hệ, enum. **Tất cả model nằm ở `UniClub-Hub.Shared/Models/`**, `DbContext` ở `UniClub-Hub.Shared/Data/UniClubDbContext.cs`. PostgreSQL qua Npgsql + EF Core.

## 1. Quy tắc dữ liệu (bắt buộc)

Chi tiết ở `.claude/rules/db-safety.md`. Tóm tắt:
- Entity mới **chỉ tạo trong `Shared/Models/`** và **chỉ sau khi user duyệt schema**.
- Agent **không** sửa file trong `Shared/Models/`, **không** tạo/sửa file trong `Migrations/`, **không** chạy `dotnet ef database update`. Chỉ được **đề xuất** lệnh migration cho user chạy tay.
- Cảnh báo rõ khi schema change có `DROP COLUMN` / `RENAME COLUMN` / `TRUNCATE` (nguy cơ mất dữ liệu).

Lệnh migration (user tự chạy):
```bash
dotnet ef migrations add <Name> --project UniClub-Hub.Shared --startup-project UniClub-Hub.Server
dotnet ef database update --project UniClub-Hub.Shared --startup-project UniClub-Hub.Server
```

## 2. Cross-cutting

- **Identity:** `ApplicationUser : IdentityUser` — thêm `StudentId`, `FullName`, `Major`, `AvatarUrl`, `Phone`, `Gender`, `DateOfBirth`. System role lưu ở `AspNetRoles` (`SUPER_ADMIN`, `USER`).
- **Soft delete:** entity implement `ISoftDeletable` (`IsDeleted`, `DeletedBy`) — ví dụ `Club`, `Department`, `ApplicationUser`.
- **Audit:** entity implement `IAuditable` (`CreatedAt/By`, `UpdatedAt/By`). Ngoài ra có entity `AuditLog` (system) + audit log cấp CLB.
- **JSON columns:** một số cột lưu JSON dạng string — `Club.FormSchema`, `Club.MemberFieldSchema`, `ClubMembership.MemberCustomData` (custom field theo từng CLB).

## 3. Entity theo domain

### Membership / cơ cấu tổ chức (Đề tài 1)
- `Club` — CLB. Quan hệ: `Category`, `Departments`, `ClubMemberships`, `Applications`, `PipelineStages`, `Positions`, `LandingPage`.
- `Department` — ban trong CLB (`ClubId`). Có `Members`, `Positions`, `Tasks`.
- `ClubMembership` — **bảng nối user ↔ CLB**. Gồm `UserId`, `ClubId`, `DepartmentId?`, `ClubRole`, `JoinedDate`, `ResignedDate?`, `Status` (`MembershipStatus`), `MemberCustomData` (JSON).
- `ClubApplication` — đơn xin gia nhập (`ApplicationStatus`).
- `ClubPipelineStage` — giai đoạn tuyển thành viên.
- `ResignationRequest` — đơn xin nghỉ (`ResignationStatus`, `ResignationPreference`).
- **Vị trí & quyền:** `ClubPosition`, `ClubPositionPermission`, `ClubMemberPosition` — gán chức vụ + quyền chi tiết theo CLB.
- **KPI:** `KpiConfig` (1 cấu hình / CLB) → `KpiCriteria` (tiêu chí) + `KpiGradeConfig` (thang điểm).
- `Contribution` — đóng góp / điểm hoạt động của thành viên.

### Operations (Đề tài 2)
- `ClubTask`, `TaskAssignee(s)`, `TaskComment`, `TaskAttachment`, `TaskDependency`.
- `Sprint`, `KanbanColumn`.
- `ClubEvent`, `EventRegistration`, `EventSession`, `EventStaff`.
- Enum: `TaskStatus`, `TaskPriority`, `SprintStatus`, `EventStatus`, `AttendanceStatus`, `ActivityType`.

### Portal (Đề tài 3)
- `LandingPage` (1-1 với `Club`), `Post` (`PostCategory`), `MediaGallery` (`MediaType`).

### Dùng chung
- `Category` — danh mục hệ thống.
- `Notification` + `NotificationPreference` (enum `NotificationType`; trigger ở `Shared/Constants/NotificationTriggers.cs`).
- `SupportTicket` — yêu cầu hỗ trợ.
- `SystemSetting` — cấu hình hệ thống (footer, hero, banner…).
- `AuditLog` (`AuditAction`).
- `RefreshToken` — refresh token JWT.

## 4. Enums (`Shared/Enums/`)

`ClubRole`, `ClubStatus`, `MembershipStatus`, `ApplicationStatus`, `ResignationStatus`, `ResignationPreference`, `TaskStatus`, `TaskPriority`, `SprintStatus`, `EventStatus`, `AttendanceStatus`, `ActivityType`, `NotificationType`, `PostCategory`, `MediaType`, `AuditAction`, `KpiMetricKey`.

## 5. DbSets

Đăng ký trong `UniClubDbContext` (~37 DbSet). Nguồn chuẩn: `UniClub-Hub.Shared/Data/UniClubDbContext.cs` — xem trực tiếp khi cần danh sách đầy đủ.
