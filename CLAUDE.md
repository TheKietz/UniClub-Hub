# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UniClub-Hub là hệ thống quản lý câu lạc bộ sinh viên đại học, gồm 3 phân hệ do 3 nhóm thực hiện, dùng chung một codebase và database:

| Phân hệ  | Module                   | Mô tả                                                |
| -------- | ------------------------ | ---------------------------------------------------- |
| Đề tài 1 | `UniClub-Hub.Membership` | Quản lý CLB, thành viên, cơ cấu tổ chức              |
| Đề tài 2 | `UniClub-Hub.Operations` | Quản lý hoạt động, sự kiện, công việc nội bộ         |
| Đề tài 3 | `UniClub-Hub.Portal`     | Cổng thông tin công khai, landing page, truyền thông |

**Module dùng chung** (áp dụng cho cả 3 đề tài): Auth/JWT, RBAC (Admin, Quản lý CLB, Trưởng ban, Thành viên, User công khai), danh mục hệ thống, file upload, logging/audit log, notification.

**Người dùng hiện tại** đang thực hiện **Đề tài 1 (Membership)** và **module dùng chung**.

## Tech Stack

- **Backend**: ASP.NET Core 8.0 Web API
- **Frontend**: React 19 + TypeScript + Vite
- **Database**: PostgreSQL (EF Core + Npgsql)
- **Auth**: ASP.NET Core Identity + JWT Bearer
- **API Docs**: Swagger (Swashbuckle)

## Commands

### Backend (.NET)

```bash
# Build toàn bộ solution
dotnet build UniClub-Hub.sln

# Chạy API (https://localhost:7274)
dotnet run --project UniClub-Hub.Server/UniClub-Hub.API.csproj

# Thêm migration mới
dotnet ef migrations add <MigrationName> --project UniClub-Hub.Shared --startup-project UniClub-Hub.Server

# Áp dụng migration vào DB
dotnet ef database update --project UniClub-Hub.Shared --startup-project UniClub-Hub.Server
```

### Frontend (React + Vite)

```bash
cd uniclub-hub.client
npm install
npm run dev      # Dev server: https://localhost:54610
npm run build    # tsc -b && vite build
npm run lint     # ESLint
```

### Full stack

Chạy .NET API — nó tự proxy sang Vite dev server (`https://localhost:54610`). Vite proxy `/api/*` ngược lại về backend (`https://localhost:7274`). Swagger UI: `https://localhost:7274/swagger`.

## Architecture

### Solution projects

| Project                  | Vai trò                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `UniClub-Hub.API`        | Entry point — `Program.cs`, Controllers                          |
| `UniClub-Hub.Shared`     | `UniClubDbContext`, models, `FileUploadHelper`, shared utilities |
| `UniClub-Hub.Membership` | Phân hệ thành viên (Đề tài 1)                                    |
| `UniClub-Hub.Operations` | Phân hệ vận hành (Đề tài 2)                                      |
| `UniClub-Hub.Portal`     | Phân hệ cổng thông tin (Đề tài 3)                                |
| `uniclub-hub.client`     | React 19 + TypeScript frontend                                   |

### Backend layers

1. **API layer** — `UniClub-Hub.API/Controllers/{Feature}/Controller.cs`
2. **Module layer** — Mỗi feature project đăng ký services qua `DependencyInjection.cs`
3. **Data layer** — `UniClub-Hub.Shared/Data/UniClubDbContext` (EF Core + Npgsql/PostgreSQL). `ApplicationUser` kế thừa `IdentityUser`, bổ sung `StudentId`, `FullName`, `Major`, `AvatarUrl`

### Frontend structure

```
src/
  features/
    membership/    # Đề tài 1
    operations/    # Đề tài 2
    portal/        # Đề tài 3
  components/shared/
```

### Key wiring trong Program.cs

- `AddDbContext` → PostgreSQL via `DefaultConnection` (Npgsql)
- `AddIdentity<ApplicationUser>` → password tối thiểu 6 ký tự
- `AddAuthentication` → JWT Bearer
- `AddScoped<FileUploadHelper>` — upload file vào `/uploads`, trả về relative path
- Mỗi module tự đăng ký: `AddOperations()`, `AddMembership()`, `AddPortal()`
- Static files + SPA fallback về `index.html`

## Configuration

`appsettings.json` chứa connection string PostgreSQL và JWT key. JWT key phải ≥ 32 ký tự.

Vite dùng certificate của ASP.NET dev cert. Proxy map `/api` về backend.

## Docs

- `docs/project-brief.md` — Mô tả nghiệp vụ toàn hệ thống
- `docs/team-assignments.md` — Phân chia 3 đề tài, yêu cầu chức năng từng phân hệ
