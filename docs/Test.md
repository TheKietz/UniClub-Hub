# Hướng dẫn chạy Test — UniClub Hub

## 1. Yêu cầu môi trường

| Công cụ | Dùng để | Kiểm tra |
|---|---|---|
| .NET 8 SDK | Build & chạy test backend | `dotnet --version` |
| **Docker Desktop (đang chạy)** | Test dựng PostgreSQL thật qua Testcontainers | `docker ps` không báo lỗi |
| Node.js + npm | Typecheck / lint frontend | `node -v` |

> **Bắt buộc có Docker.** Test backend KHÔNG dùng EF InMemory — mỗi lần chạy, `PostgresFixture` tự kéo image `postgres:16-alpine`, dựng container Postgres tạm và dùng **Respawn** reset dữ liệu giữa các test (xem `UniClub-Hub.Tests/Infrastructure/PostgresFixture.cs`). Lần chạy đầu sẽ hơi lâu do tải image; các lần sau nhanh hơn.

## 2. Trước khi chạy: tắt API server

Nếu backend đang chạy (F5 / `dotnet run`), file DLL trong `bin/` bị khóa → build/test sẽ fail với lỗi `MSB3027: Could not copy ... being used by another process`.

➡️ **Tắt API server trước khi build hoặc chạy test**, hoặc dừng debug trong Visual Studio/VS Code.

## 3. Chạy test backend

Chạy từ thư mục gốc solution (`d:\Web-core\UniClub-Hub`):

```powershell
# Toàn bộ test
dotnet test UniClub-Hub.Tests

# Gọn output hơn
dotnet test UniClub-Hub.Tests -v q --nologo
```

### Chạy theo nhóm / class / test cụ thể

```powershell
# Một class test
dotnet test UniClub-Hub.Tests --filter "FullyQualifiedName~TaskServiceTests"

# Nhiều class cùng lúc
dotnet test UniClub-Hub.Tests --filter "FullyQualifiedName~TaskServiceTests|FullyQualifiedName~ContributionAwardServiceTests"

# Một test duy nhất
dotnet test UniClub-Hub.Tests --filter "FullyQualifiedName~UpdateStatus_ToDone_WithOpenSubTasks_ReturnsError"

# Theo module (namespace mirror cấu trúc: Operations / Membership / Portal)
dotnet test UniClub-Hub.Tests --filter "FullyQualifiedName~UniClub_Hub.Tests.Operations"
```

### Xem chi tiết từng test pass/fail

```powershell
dotnet test UniClub-Hub.Tests --logger "console;verbosity=detailed"
```

## 4. Cấu trúc & quy ước test

- Vị trí: `UniClub-Hub.Tests/` — chia theo module: `Tests/Operations/`, `Tests/Membership/`, `Tests/Portal/`.
- Đặt tên: `[MethodName]_[Scenario]_[ExpectedResult]`
  - Ví dụ: `UpdateStatus_ToDone_WithoutReviewing_ReturnsError`
- Phạm vi test:
  - **Service layer** (business logic): unit test với DbContext thật trên Postgres container.
  - **API endpoints**: integration test qua `WebApplicationFactory` (`Infrastructure/ApiFactory.cs`).
  - Không test DTO, mapping đơn giản, hay EF configuration.

## 5. Test liên quan các rule trạng thái công việc (mới)

Các rule sau được cover trong `Tests/Operations/TaskServiceTests.cs`:

| Test | Rule kiểm tra |
|---|---|
| `UpdateStatus_ToDone_ShouldSetCompletedAtAndProgress100` | Reviewing → Done hợp lệ, ép progress = 100 |
| `UpdateStatus_ToDone_WithoutReviewing_ReturnsError` | Chưa "Đang duyệt" thì không được Hoàn thành |
| `UpdateStatus_ToDone_ByMember_ReturnsUnauthorized` | MEMBER không được chuyển vào Done |
| `UpdateStatus_OutOfDone_ByMember_ReturnsUnauthorized` | MEMBER không được chuyển ra khỏi Done |
| `UpdateStatus_ToDone_WithOpenSubTasks_ReturnsError` | Task cha bị chặn khi còn task con chưa xong |
| `UpdateStatus_ToDone_WithAllSubTasksDone_ShouldSucceed` | Task con xong hết thì cha mới Done được |
| `UpdateTask_WithoutEventId_PreservesEventId` | PUT thiếu `eventId` không làm task rơi khỏi sự kiện |

Chạy nhanh nhóm này:

```powershell
dotnet test UniClub-Hub.Tests --filter "FullyQualifiedName~TaskServiceTests|FullyQualifiedName~ContributionAwardServiceTests"
```

## 6. Frontend

Frontend hiện chưa có test runner (Vitest/Jest) — kiểm tra bằng typecheck + lint:

```powershell
cd uniclub-hub.client

# Typecheck TypeScript
npx tsc -b

# Lint
npm run lint

# Build đầy đủ (tsc + vite)
npm run build
```

## 7. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `MSB3027 / MSB3021: Could not copy ... DLL` | API server đang chạy, khóa `bin/` | Tắt server rồi chạy lại |
| `Docker.DotNet...` / test treo ở khởi tạo fixture | Docker Desktop chưa chạy | Mở Docker Desktop, chờ engine sẵn sàng (`docker ps` chạy được) |
| Lần đầu chạy rất lâu | Đang tải image `postgres:16-alpine` | Chờ lần đầu, các lần sau nhanh |
| Test fail hàng loạt sau khi đổi Entity | Schema container tạo bằng `EnsureCreated` từ model hiện tại | Build lại solution rồi chạy lại test |
