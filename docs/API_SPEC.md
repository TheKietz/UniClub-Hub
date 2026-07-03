# API Spec — UniClub-Hub

> Quy ước API + bản đồ endpoint. Rule cứng nằm ở `.claude/rules/uniclub-api-contract.md` và `.claude/rules/integration-standards.md` — file này tổng hợp lại + liệt kê controller hiện có.

## 1. Quy ước (bắt buộc)

- **URL:** prefix `/api` — **không** dùng `/api/v1` thống nhất toàn project.
  - **Membership / Admin / shared:** route theo resource, ví dụ `/api/auth`, `/api/clubs/{clubId}/members`, `/api/admin/users`.
  - **Operations:** `/api/v1/operations/...` (module Đề tài 2 đã áp `v1`).
  - Envelope, pagination, DTO vẫn bắt buộc; versioning URL đầy đủ có thể làm sau nếu có client bên ngoài.
- **Response envelope:**
  ```json
  { "data": <payload>, "message": "string", "success": true }
  ```
- **Lỗi:** dùng ASP.NET Core `ProblemDetails`. Frontend bắt lỗi → hiển thị Toast.
- **Pagination:** list endpoint hỗ trợ `?page=1&pageSize=20`, response gồm `{ data, totalCount, page, pageSize }`.
- **DTO:** không expose entity trực tiếp. Request: `Create[Resource]Request` / `Update[Resource]Request`. Response: `[Resource]Response` / `[Resource]SummaryResponse`. (Trong code hiện tại nhiều DTO dùng hậu tố `Dto` — giữ nhất quán theo từng module.)
- **Naming:** Backend PascalCase, Frontend camelCase — map tự động khi tích hợp.
- **Loading state:** mọi call FE phải có loading để chặn double-submit.

## 2. Bản đồ endpoint (controllers hiện có)

Controllers ở `UniClub-Hub.Server/Controllers/`, gom theo area.

### Membership (Đề tài 1) — route thực tế (không có prefix `/api/v1/membership`)

| Resource | Base route | Controller |
| -------- | ---------- | ---------- |
| Auth (login/register/refresh/forgot) | `/api/auth` | `AuthController` |
| Clubs | `/api/clubs` | `ClubsController` |
| Club memberships | `/api/clubs/{clubId}/members` | `ClubMembershipsController` |
| Departments | `/api/clubs/{clubId}/departments` | `DepartmentsController` |
| Club positions | `/api/clubs/{clubId}/positions` | `ClubPositionsController` |
| Club permissions | `/api/club-permissions` | `ClubPermissionsController` |
| Applications (đơn gia nhập) | `/api/clubs/{clubId}/applications` | `ApplicationsController` |
| Recruitment pipeline | `/api/clubs/{clubId}/pipeline` | `PipelineController` |
| Resignation requests | `/api/clubs/{clubId}/resignation-requests`, `/api/admin/resignation-requests` | `ResignationRequestsController` |
| KPI | `/api/clubs/{clubId}/kpi` | `KpiController` |
| Categories | `/api/categories` | `CategoriesController` |
| Notifications | `/api/notifications` | `NotificationsController` |
| Notification prefs | `/api/membership/...` | `NotificationPreferencesController` |
| Support tickets | `/api/support` | `SupportController` |
| Stats | `/api/admin/stats`, `/api/clubs/{clubId}/stats` | `StatsController` |
| Club audit logs | `/api/clubs/{clubId}/audit-logs` | `ClubAuditLogsController` |
| Import (club members) | `/api/clubs/{clubId}/members/...` | `ImportController` |
| Export | `/api/clubs/{clubId}/members/export`, `.../applications/export` | `ExportController` |
| Admin import | `/api/admin/import` | `AdminImportController` |
| Users | `/api/users` | `UsersController` |
| Uploads | `/api/uploads/...` | `UploadsController` |

### Admin (module dùng chung) — `/api/admin/...` (không có `v1`)

`AdminUsersController` (`/api/admin/users`), `AdminClubsController`, `AdminDepartmentsController`, `AdminCategoriesController`, `SystemSettingsController` (`/api/admin/settings`).

### Operations (Đề tài 2) — `/api/v1/operations/...`
`TasksController`, `TaskAssigneesController`, `SprintsController`, `KanbanColumnsController`, `EventsController`, `AuditLogsController`. Realtime qua SignalR Hub (`UniClub-Hub.Server/Hubs/KanbanHub.cs`).

### Portal (Đề tài 3) — `/api/v1/portal/...`
Đang ở giai đoạn đầu (`Controller.cs` placeholder).

## 3. Auth flow

- `AuthController`: register / login → trả JWT + refresh token. Refresh qua `RefreshTokenRequestDto`. Quên mật khẩu qua `ForgotPasswordDto`.
- Google OAuth + xác thực email: **đã có DTO/scaffold nhưng để lại làm sau** (xem `docs/decisions/`).
- JWT Bearer bảo vệ endpoint; quyền chi tiết theo CLB kiểm tra trong service layer (`IClubPermissionService`).

## 4. SignalR (chỉ Operations)

- Hub: `UniClub-Hub.Server/Hubs/`. Tên event/method là `public const string` trong `UniClub-Hub.Shared/Constants/SignalREvents.cs`.
- **Không** dùng raw string cho event name; FE import từ file constants mirror.
- **Không** thêm Hub method cho Membership/Portal.

## 5. Swagger

`https://localhost:7274/swagger` khi chạy backend.
