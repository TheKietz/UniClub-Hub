# API Spec — UniClub-Hub

> Quy ước API + bản đồ endpoint. Rule cứng nằm ở `.claude/rules/uniclub-api-contract.md` và `.claude/rules/integration-standards.md` — file này tổng hợp lại + liệt kê controller hiện có.

## 1. Quy ước (bắt buộc)

- **URL:** `/api/v1/[module]/[resource]` — ví dụ `/api/v1/membership/members`, `/api/v1/operations/tasks`.
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

### Membership (Đề tài 1) — `/api/v1/membership/...`
| Resource              | Controller                          |
| --------------------- | ----------------------------------- |
| Auth (login/register/refresh/forgot) | `AuthController`             |
| Clubs                 | `ClubsController`                   |
| Club memberships      | `ClubMembershipsController`         |
| Departments           | `DepartmentsController`             |
| Club positions        | `ClubPositionsController`           |
| Club permissions      | `ClubPermissionsController`         |
| Applications (đơn gia nhập) | `ApplicationsController`      |
| Recruitment pipeline  | `PipelineController`                |
| Resignation requests  | `ResignationRequestsController`     |
| KPI                   | `KpiController`                     |
| Categories            | `CategoriesController`              |
| Notifications         | `NotificationsController`           |
| Notification prefs    | `NotificationPreferencesController` |
| Support tickets       | `SupportController`                 |
| Stats                 | `StatsController`                   |
| Club audit logs       | `ClubAuditLogsController`           |
| Import / Export       | `ImportController`, `ExportController`, `AdminImportController` |
| Users                 | `UsersController`                   |
| Uploads               | `UploadsController`                 |

### Admin (module dùng chung) — `/api/v1/admin/...`
`AdminUsersController`, `AdminClubsController`, `AdminDepartmentsController`, `AdminCategoriesController`, `SystemSettingsController`.

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
