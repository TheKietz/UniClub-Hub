# Architecture — UniClub-Hub

> Nguồn sự thật về kiến trúc hệ thống. File này dành cho **mọi người + mọi agent** (Claude, Codex, Cursor). Các file `CLAUDE.md` / `AGENTS.md` chỉ trỏ về đây, không chép lại.

## 1. Tổng quan

UniClub-Hub là **modular monolith**: một solution .NET + một SPA React, **dùng chung một database**. Hệ thống chia làm 3 phân hệ do 3 nhóm thực hiện:

| Phân hệ  | Module project           | Phạm vi nghiệp vụ                                          |
| -------- | ------------------------ | --------------------------------------------------------- |
| Đề tài 1 | `UniClub-Hub.Membership` | CLB, thành viên, cơ cấu tổ chức, KPI, RBAC CLB, báo cáo    |
| Đề tài 2 | `UniClub-Hub.Operations` | Hoạt động, sự kiện, task, sprint, Kanban/Gantt, realtime  |
| Đề tài 3 | `UniClub-Hub.Portal`     | Landing page công khai, CMS, form đăng ký, analytics, SEO |

**Module dùng chung (cả 3 đề tài):** Auth/JWT, RBAC, danh mục hệ thống, file upload, audit log, notification, system settings.

> Ranh giới nghiệp vụ là **dọc theo module** (mỗi nhóm ôm cả FE + BE của module mình), không phải theo tầng frontend/backend.

## 2. Tech stack

- **Backend:** ASP.NET Core 8.0 Web API
- **Frontend:** React 19 + TypeScript + Vite
- **Database:** PostgreSQL (EF Core + Npgsql)
- **Auth:** ASP.NET Core Identity + JWT Bearer (+ refresh token)
- **API docs:** Swagger (Swashbuckle)
- **File storage:** Cloudinary (+ local `/uploads` fallback)
- **Realtime:** SignalR (chỉ dùng ở Operations)

## 3. Cấu trúc solution

| Project                  | Vai trò                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `UniClub-Hub.Server`     | Entry point — `Program.cs`, Controllers, Hubs. Output assembly: `UniClub-Hub.API` (`UniClub-Hub.API.csproj`) |
| `UniClub-Hub.Shared`     | `UniClubDbContext`, **tất cả Models/Entities**, Enums, Constants, helpers |
| `UniClub-Hub.Membership` | Phân hệ thành viên (Đề tài 1) — DTOs + Services                           |
| `UniClub-Hub.Operations` | Phân hệ vận hành (Đề tài 2)                                                |
| `UniClub-Hub.Portal`     | Phân hệ cổng thông tin (Đề tài 3)                                          |
| `UniClub-Hub.Tests`      | Test project (mirror module structure)                                    |
| `uniclub-hub.client`     | React 19 + TypeScript frontend                                            |

> ⚠️ Lưu ý đặt tên: thư mục/project dùng gạch nối `UniClub-Hub.*`. Project Server build ra assembly tên `UniClub-Hub.API`. Controllers nằm trong `UniClub-Hub.Server/Controllers/`, Hub nằm trong `UniClub-Hub.Server/Hubs/`.

## 4. Quy tắc kiến trúc (bắt buộc)

Chi tiết ràng buộc trong `.claude/rules/global-architecture.md`. Tóm tắt:

- **Entity chỉ ở `Shared`.** Không tạo `Models`/`Entities`/`DTOs` trong các module project (DTO của module thì để trong chính module đó, ví dụ `UniClub-Hub.Membership/DTOs/`).
- **Không reference chéo giữa các module.** Module chỉ được reference `Shared`. Giao tiếp cross-module đi qua `Shared` hoặc qua API contract (DTO trong module).
- **Không duplicate entity** giữa các module — luôn import từ `Shared`.
- Tạo entity mới **chỉ trong `Shared`** và **chỉ sau khi user duyệt schema** (xem `.claude/rules/db-safety.md`).

## 5. Tầng backend

1. **API layer** — `UniClub-Hub.Server/Controllers/{Area}/...Controller.cs` (Membership / Operations / Portal / Admin).
2. **Module layer** — mỗi module đăng ký service qua `DependencyInjection.cs` (`AddMembership()`, `AddOperations()`, `AddPortal()`). Service triển khai ở `Services/Implements/`, interface ở `Services/Interfaces/`.
3. **Data layer** — `UniClub-Hub.Shared/Data/UniClubDbContext` (EF Core + Npgsql).

Wiring chính trong `Program.cs`:
- `AddDbContext` → PostgreSQL qua connection string `DefaultConnection`.
- `AddIdentity<ApplicationUser>` → password tối thiểu 6 ký tự.
- `AddAuthentication` → JWT Bearer (key ≥ 32 ký tự).
- File upload helper → upload vào `/uploads`, trả relative path; Cloudinary cho ảnh.
- Static files + SPA fallback về `index.html`.

## 6. Cấu trúc frontend

```
uniclub-hub.client/src/
  features/
  components/
    membership/   # Đề tài 1
    operations/   # Đề tài 2
    portal/       # Đề tài 3
    shared/
```
Trang quản lý Membership: `components/membership/pages/` (CLB: `pages/club/`, admin: `pages/admin/`).

## 7. Phân quyền (RBAC) — 2 tầng

1. **System role** (ASP.NET Identity `AspNetRoles`) — `SystemRole` trong `Shared/Common/AppConstants.cs`:
   - `SUPER_ADMIN`, `USER`.
2. **Club role** (trong phạm vi 1 CLB) — enum `ClubRole`:
   - `MEMBER`, `DEPT_LEAD`, `CLUB_ADMIN`.
   - Lưu ở `ClubMembership.ClubRole`.
3. **Quyền chi tiết theo CLB** — hằng trong `Shared/Constants/ClubPermissions.cs`, gán qua `ClubPosition` / `ClubPositionPermission` / `ClubMemberPosition`. Service kiểm tra bằng `IClubPermissionService.EnsureHasPermissionAsync(...)`.

## 8. Chạy dự án

Xem `CLAUDE.md` (mục Commands) và `docs/API_SPEC.md`. Tóm tắt:
- Backend: `dotnet run --project UniClub-Hub.Server/UniClub-Hub.API.csproj` → `https://localhost:7274` (Swagger ở `/swagger`).
- Frontend: `cd uniclub-hub.client && npm run dev` → `https://localhost:54610`.
- Chạy .NET API là đủ — nó tự proxy sang Vite; Vite proxy `/api/*` về backend.

## Tài liệu liên quan

- `docs/API_SPEC.md` — quy ước API + bản đồ endpoint
- `docs/DATABASE.md` — entity, quan hệ, enum
- `docs/decisions/` — ADR (quyết định kiến trúc)
- `docs/project-brief.md`, `docs/team-assignments.md` — nghiệp vụ & phân chia đề tài
- `.claude/rules/` — rule cứng (db-safety, api-contract, integration, testing, signalr…)
