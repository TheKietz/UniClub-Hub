# Hướng dẫn đọc code UniClub-Hub

> Mục tiêu: đọc theo **thứ tự có chủ đích** thay vì mở bừa file. Đọc xong là trả lời được
> "dữ liệu chảy từ đâu tới đâu", "click nút này thì gọi API nào, vào service nào, đụng bảng nào".
>
> Cách dùng: làm theo 7 chặng dưới đây **đúng thứ tự**. Mỗi chặng có *đọc gì*, *cần rút ra điều gì*.
> Nếu gấp, đọc tối thiểu các file ⭐. Trước khi bảo vệ, đọc thêm mục **"Bẫy cần biết"** ở cuối —
> đó là những chỗ dễ bị hỏi xoáy nhất.

---

## Bản đồ tư duy 10 giây

```
Trình duyệt (React)  →  /api/v1/...  →  Controller  →  Service (logic)  →  DbContext  →  PostgreSQL
   uniclub-hub.client     (envelope)     Server/         Membership/        Shared/Data    (EF Core)
                                         Controllers/     Services/Implements
```

- **1 database, 1 solution .NET, 1 SPA React** (modular monolith).
- Chia 3 phân hệ theo nghiệp vụ: **Membership** (của bạn), **Operations**, **Portal**.
- Entity (bảng) **chỉ nằm ở `UniClub-Hub.Shared/Models/`** — module nào cũng import từ đây.

---

## Chặng 1 — Đọc tài liệu trước, đừng mở code vội (30 phút)

Đọc theo thứ tự, đây là "bản đồ" trước khi vào rừng:

1. ⭐ [docs/ARCHITECTURE.md](ARCHITECTURE.md) — tổng quan hệ thống, 6 project làm gì, quy tắc kiến trúc.
2. ⭐ [docs/DATABASE.md](DATABASE.md) — các bảng (entity) theo domain, quan hệ, enum.
3. ⭐ [docs/API_SPEC.md](API_SPEC.md) — quy ước API (envelope, URL, phân trang) + danh sách controller.
4. [docs/project-brief.md](project-brief.md) + [docs/team-assignments.md](team-assignments.md) — nghiệp vụ & ai làm gì.
5. [.claude/rules/](../.claude/rules/) — các "luật cứng" (db-safety, api-contract, global-architecture…).

**Cần rút ra:** 3 phân hệ là gì, ranh giới module ("entity chỉ ở Shared, không reference chéo module"),
envelope chuẩn `{ data, message, success }`, URL `/api/v1/[module]/[resource]`.

---

## Chặng 2 — Backend: điểm vào & cách ráp hệ thống (1 file)

⭐ [UniClub-Hub.Server/Program.cs](../UniClub-Hub.Server/Program.cs) — đọc **cả file** (~260 dòng). Đây là nơi mọi thứ được "cắm dây":

| Dòng | Việc gì | Ý nghĩa |
| --- | --- | --- |
| `AddDbContext<UniClubDbContext>` | Nối PostgreSQL | Toàn hệ thống dùng **1** DbContext ở Shared |
| `AddIdentity<ApplicationUser, IdentityRole>` | Đăng nhập, mật khẩu | System role lưu ở `AspNetRoles` |
| `AddAuthentication(...JWT...)` | Bảo vệ endpoint | Token Bearer + refresh |
| `AddMembershipServices()` / `AddOperationsServices()` / `AddPortalServices()` | Đăng ký service mỗi module | Mỗi module có file `DependencyInjection.cs` riêng |
| `app.UseAuthentication()` | Bật xác thực | Thứ tự middleware quan trọng |
| `app.MapControllers()` | Bật API | |
| `app.MapHub<KanbanHub>("/hubs/kanban")` | SignalR | **Chỉ** Operations dùng realtime |
| `app.MapFallbackToFile("/index.html")` | Trả SPA | Mọi route không phải /api → React lo |

Sau đó mở 1 file đăng ký service để thấy "service nào map vào interface nào":
[UniClub-Hub.Membership/DependencyInjection.cs](../UniClub-Hub.Membership/DependencyInjection.cs).

**Cần rút ra:** request đi vào → middleware xác thực → controller → service (được inject qua DI).

---

## Chặng 3 — Trace **một luồng dọc** xuyên backend (quan trọng nhất)

Đừng đọc dàn trải. Chọn **1 nghiệp vụ** và lần theo nó từ trên xuống dưới. Gợi ý: **"Lấy danh sách CLB"**.

Lần theo 4 lớp:

1. **Controller** — [UniClub-Hub.Server/Controllers/Membership/ClubsController.cs](../UniClub-Hub.Server/Controllers/Membership/ClubsController.cs)
   - Xem route `[Route("api/v1/membership/clubs")]`, các action (`GetAll`, `GetById`, `Create`…).
   - Để ý: controller **mỏng** — chỉ nhận request, gọi service, bọc kết quả vào envelope.
2. **Interface service** — [UniClub-Hub.Membership/Services/Interfaces/IClubService.cs](../UniClub-Hub.Membership/Services/Interfaces/IClubService.cs)
   - "Hợp đồng": service này làm được gì.
3. **Service triển khai** — `UniClub-Hub.Membership/Services/Implements/ClubService.cs`
   - **Đây là nơi có logic thật**: query EF, kiểm tra quyền, map entity → DTO, soft-delete…
4. **Entity + DbContext** — [UniClub-Hub.Shared/Models/Club.cs](../UniClub-Hub.Shared/Models/Club.cs) và
   [UniClub-Hub.Shared/Data/UniClubDbContext.cs](../UniClub-Hub.Shared/Data/UniClubDbContext.cs)
   - Bảng `Club` có cột gì, quan hệ với `Department`, `ClubMembership`… ra sao.

Và xem **DTO** (dữ liệu trả ra, không lộ entity): thư mục [UniClub-Hub.Membership/DTOs/Club/](../UniClub-Hub.Membership/DTOs/Club/).

> Lặp lại bài tập này 2–3 lần với các luồng khác nhau là hiểu được cả backend:
> - **Đăng nhập** → `AuthController` → `IAuthService`/`AuthService` → `ApplicationUser` + `RefreshToken`.
> - **Nộp đơn gia nhập** → `ApplicationsController` → `ApplicationService` → `ClubApplication`/`ClubMembership`.
> - **Từ chức / rời CLB** → `ResignationsController` → `ResignationService.ReviewAsync` — chú ý 2 nhánh
>   `BecomeMember` (hạ role về MEMBER) và `LeaveClub` (resign **tất cả** dòng membership Active/Probation
>   của user trong CLB — xem mục "Bẫy cần biết" vì sao phải là *tất cả*).
> - **Phân quyền theo CLB** → `IClubPermissionService.EnsureHasPermissionAsync(...)` (cơ chế RBAC cấp CLB).

**Cần rút ra:** mô hình **Controller → Service → DbContext** lặp lại y hệt cho MỌI nghiệp vụ. Hiểu 1 luồng = hiểu tất cả.

---

## Chặng 4 — Frontend: điểm vào & định tuyến (1 file)

1. [uniclub-hub.client/src/main.tsx](../uniclub-hub.client/src/main.tsx) — bootstrap React.
2. ⭐ [uniclub-hub.client/src/App.tsx](../uniclub-hub.client/src/App.tsx) — **bản đồ tất cả các trang** (~410 dòng).
   - Đọc danh sách `<Route>`: route nào **public**, route nào bọc `<ProtectedRoute>` (cần đăng nhập),
     route nào `requireAdmin`, route nào `<ClubProtectedRoute>` (cần role trong CLB).
   - Đây là cách nhanh nhất để biết "ứng dụng có những màn hình nào".

**Cần rút ra:** mỗi `Route` → 1 page component. Phân quyền ở FE thể hiện bằng các wrapper route.

---

## Chặng 5 — Trace **một luồng dọc** xuyên frontend

Tiếp tục với nghiệp vụ "danh sách CLB" để khớp với chặng 3:

1. **Page** — `ClubListPage` (tìm trong `src/components/membership/pages/` hoặc qua `App.tsx`).
2. **Gọi API** — [uniclub-hub.client/src/components/membership/services/clubApi.ts](../uniclub-hub.client/src/components/membership/services/clubApi.ts)
   - Hàm như `getClubs()` gọi `api.get('/v1/membership/clubs')`.
3. **Axios client** — ⭐ [uniclub-hub.client/src/lib/axiosInstance.ts](../uniclub-hub.client/src/lib/axiosInstance.ts)
   - Tự đính kèm JWT vào header, tự refresh khi gặp 401, xử lý trang public.
4. **Kiểu dữ liệu** — `src/components/membership/services/club.types.ts` (FE camelCase, BE PascalCase, map tự động).

Và xem cơ chế đăng nhập phía FE:
- ⭐ [uniclub-hub.client/src/contexts/AuthContext.tsx](../uniclub-hub.client/src/contexts/AuthContext.tsx) + [src/hooks/useAuth.ts](../uniclub-hub.client/src/hooks/useAuth.ts)
  — `user`, `isAuthenticated`, `isSuperAdmin`, `logout()`, danh sách `memberships` (vai trò trong từng CLB).
- Quyền chi tiết theo CLB ở FE: [src/hooks/useClubPermissions.ts](../uniclub-hub.client/src/hooks/useClubPermissions.ts).

**Cần rút ra:** Page → hàm trong `*Api.ts` → `axiosInstance` (gắn token) → backend. Trạng thái đăng nhập đến từ `AuthContext`.

---

## Chặng 6 — Đào sâu khu vực của bạn: Membership + module dùng chung

Đây là phần bạn **phải nói trôi chảy** vì là đề tài của bạn.

**Cấu trúc thư mục trang quản lý** (FE):
- `src/components/membership/pages/admin/` — trang của SUPER_ADMIN (quản trị toàn hệ thống).
- `src/components/membership/pages/club/` — trang quản lý trong 1 CLB (CLUB_ADMIN/DEPT_LEAD).
- `src/components/membership/pages/shared/` — dùng chung.

**Các service backend nên biết tên** (trong `UniClub-Hub.Membership/Services/Interfaces/`):
`IClubService`, `IClubMembershipService`, `IDepartmentService`, `IClubPositionService`,
`IClubPermissionService`, `IApplicationService`, `IPipelineService`, `IResignationService`,
`IKpiService`, `INotificationService`, `IStatsService`, `IAuthService`, `IUserService`.

**3 khái niệm RBAC phải phân biệt được** (xem [docs/ARCHITECTURE.md](ARCHITECTURE.md) mục 7):
1. **System role** (`SUPER_ADMIN` / `USER`) — toàn hệ thống, lưu ở Identity.
2. **Club role** (`MEMBER` / `DEPT_LEAD` / `CLUB_ADMIN`) — trong phạm vi 1 CLB, lưu ở `ClubMembership.ClubRole`.
3. **Quyền chi tiết theo CLB** — `ClubPosition` + `ClubPositionPermission` + `ClubMemberPosition`,
   kiểm tra qua `IClubPermissionService`.

**Vòng đời thành viên** (kể được chuỗi này là hiểu nghiệp vụ cốt lõi):
`ClubApplication` (nộp đơn) → duyệt qua `ClubPipelineStage` → Accept → tạo `ClubMembership`
(**Probation** — thử việc) → được xác nhận lên **Active** (`PromoteMemberAsync`)
→ hoạt động/`Contribution`/`Kpi` → rời CLB theo 1 trong 2 đường:
- **MEMBER thường**: tự rời ngay (`ClubMembershipService.ResignAsync`) hoặc bị xóa (`RemoveMemberAsync`) — cả hai đều là soft-delete: `Status = Resigned`.
- **CLUB_ADMIN / DEPT_LEAD**: phải gửi `ResignationRequest` và chờ duyệt (`ResignationService`);
  chọn `BecomeMember` (chỉ hạ chức) hoặc `LeaveClub` (rời hẳn CLB).

**Ai duyệt đơn từ chức?** Đơn của DEPT_LEAD do CLUB_ADMIN duyệt (trong trang CLB);
đơn của CLUB_ADMIN do SUPER_ADMIN duyệt (trang admin hệ thống). Không ai tự duyệt đơn của mình.

---

## Chặng 7 — Dữ liệu demo & kiểm thử (đọc trước khi demo/bảo vệ)

1. ⭐ [UniClub-Hub.Server/Data/DbSeeder.cs](../UniClub-Hub.Server/Data/DbSeeder.cs) (~2000 dòng, đọc lướt theo section comment)
   — **toàn bộ dữ liệu demo sinh ra ở đây**: tài khoản mẫu (`truong.clb@uef.edu.vn`, `linh.clb@uef.edu.vn`…),
   CLB TECH, ban/phòng, đơn từ chức mẫu, thông báo mẫu. Khi demo mà "thấy dữ liệu lạ", tra ngược file này trước tiên.
   Mỗi block seed đều có guard `if (!await db.X.AnyAsync())` → seed chỉ chạy trên DB trống; muốn nhận
   dữ liệu seed mới phải **re-seed** (xóa DB dev rồi chạy lại), không phải chỉ restart.
2. [UniClub-Hub.Tests/](../UniClub-Hub.Tests/) — 156 test (Membership + Operations), chạy bằng `dotnet test`.
   Đọc tên test là hiểu spec nghiệp vụ: ví dụ `ReviewAsync_WithApprovedLeaveClub_ResignsAllActiveMembershipRowsForUser`
   nói rõ luật "duyệt LeaveClub → resign mọi dòng membership". Test dùng
   [Infrastructure/](../UniClub-Hub.Tests/Infrastructure/) tạo DbContext in-memory — không đụng DB thật.
3. Chiến lược kiểm thử của nhóm: Unit test cho service + manual test cho luồng chính
   (xem [docs/manual-test-lint-fix.md](manual-test-lint-fix.md)).

**Cần rút ra:** demo dựa trên seed → trạng thái seed phải khớp luật nghiệp vụ hiện tại; khi sửa luật
(như vụ LeaveClub) phải rà lại cả DbSeeder lẫn test đi kèm.

---

## Bẫy cần biết (những chỗ dễ bị hỏi xoáy / dễ gây bug)

1. **Một user có thể có NHIỀU dòng `ClubMembership` trong cùng 1 CLB — nhưng chỉ 1 dòng đang hoạt động.**
   Ràng buộc được enforce ở **2 tầng**:
   - **Tầng DB**: partial unique index `(ClubId, UserId) WHERE Status IN (Active, Probation)`
     (migration `EnforceSingleActiveMembershipPerClub`) — dòng Resigned nằm ngoài ràng buộc để giữ lịch sử,
     nên 1 user vẫn có thể có nhiều dòng Resigned + 1 dòng Active trong cùng CLB.
   - **Tầng service**: các luồng nộp đơn/AddMember kiểm tra "đã là thành viên" trước khi tạo dòng mới.
   Hệ quả khi viết/đọc query (vẫn giữ phong cách phòng thủ):
   - Không `FirstOrDefault` một dòng bất kỳ rồi suy ra vai trò — lọc `Status` rồi xét đúng dòng Active
     (gốc rễ họ bug "rời CLB nhưng vẫn hiện trưởng ban" đã sửa 07/2026 trong `ResignationService` & Operations).
   - Đếm thành viên đếm `UserId` **distinct** (dữ liệu trước migration có thể còn nhiều dòng active
     đã được migration tự chuyển thành Resigned, chỉ giữ dòng có role cao nhất).
   - Câu trả lời khi bị hỏi "ràng buộc ở đâu?": *cả DB (partial unique index) lẫn service layer —
     DB là chốt chặn cuối, service cho message lỗi thân thiện.*
2. **Soft-delete khắp nơi.** Rời CLB = `Status = Resigned` (dòng vẫn nằm trong bảng để giữ lịch sử).
   Vì vậy **mọi query nghiệp vụ phải lọc `Status == Active` (± `Probation`)**; quên lọc là "người đã nghỉ vẫn hiện".
   Club/Department cũng soft-delete bằng `IsDeleted` + global query filter trong `UniClubDbContext`.
3. **Resign không reset `ClubRole`.** Dòng Resigned vẫn giữ role cũ (DEPT_LEAD…) — đúng chủ đích để giữ lịch sử,
   nhưng nghĩa là "là trưởng ban" luôn phải hiểu là `ClubRole == DEPT_LEAD && Status == Active`.
4. **Route chưa đồng nhất 100%.** Chuẩn là `/api/v1/[module]/...` nhưng còn vài route cũ:
   `api/categories`, `api/admin/categories` (quyết định đồng bộ `/api/v1` đang chờ chốt).
   FE: các hàm trong `*Api.ts` truyền path **tương đối với `baseURL` (`/api`)** của axios —
   đừng dùng `apiUrl()` lồng thêm `/api` nữa (sẽ thành `/api/api/...`).
5. **2 nhánh duyệt đơn từ chức khác nhau về phạm vi:** `BecomeMember` chỉ tác động **1 dòng** membership
   gắn với đơn; `LeaveClub` tác động **mọi dòng** Active/Probation của user trong CLB đó.
6. **Guard "LAST_CLUB_ADMIN".** Không thể hạ cấp/xóa CLUB_ADMIN cuối cùng của CLB
   (`ClubMembershipService`, message bắt đầu bằng `LAST_CLUB_ADMIN:` để FE nhận diện); SUPER_ADMIN có thể `force`.

---

## Mẹo đọc nhanh & câu hỏi tự kiểm tra

**Mẹo:**
- Luôn đi theo cặp **Controller ↔ Service ↔ Entity ↔ DTO** cùng tên (Club → ClubsController → ClubService → Club.cs → DTOs/Club).
- FE: gặp page lạ → tìm hàm `*Api.ts` nó gọi → biết ngay endpoint backend.
- Tra cứu nhanh: dùng tên file. Ví dụ muốn biết "duyệt đơn" ở đâu → tìm `Application`.

**Tự kiểm tra (trả lời được là đã hiểu):**
1. Người dùng bấm "Đăng nhập" → đi qua những file/lớp nào tới khi có token? *(LoginPage → authApi → axiosInstance → AuthController → AuthService → ApplicationUser/RefreshToken)*
2. Entity mới được tạo ở đâu, và ai được phép tạo? *(chỉ ở `Shared/Models/`, và chỉ sau khi user duyệt schema — luật db-safety)*
3. Vì sao Membership **không** được gọi thẳng code của Operations? *(luật global-architecture: không reference chéo module; giao tiếp qua Shared)*
4. Phân biệt 3 tầng RBAC ở trên.
5. Envelope API chuẩn là gì, lỗi trả về kiểu gì? *(`{data,message,success}`; lỗi dùng ProblemDetails → Toast ở FE)*
6. Realtime (SignalR) dùng ở phân hệ nào? *(chỉ Operations)*
7. MEMBER thường rời CLB khác gì DEPT_LEAD/CLUB_ADMIN rời CLB? *(MEMBER tự rời ngay; lead phải gửi `ResignationRequest` chờ duyệt — 2 nhánh BecomeMember/LeaveClub)*
8. Vì sao duyệt LeaveClub phải resign **tất cả** dòng membership của user trong CLB? *(1 user có thể có nhiều dòng — xem "Bẫy cần biết" #1)*
9. Dữ liệu demo sinh từ đâu, muốn thấy dữ liệu seed mới thì làm gì? *(DbSeeder; phải re-seed DB trống, restart không đủ)*

---

## Lệnh chạy thử (để vừa đọc vừa bấm)

```bash
# Backend (kèm Swagger để xem toàn bộ endpoint trực quan)
dotnet run --project UniClub-Hub.Server/UniClub-Hub.API.csproj   # https://localhost:7274/swagger

# Frontend (chạy backend là đủ — nó tự proxy sang Vite)
cd uniclub-hub.client && npm run dev                              # https://localhost:54610
```

> Mở **Swagger** (`/swagger`) song song khi đọc controller — thấy ngay request/response thật của từng endpoint.
> Mở **DevTools → Network** khi bấm trên UI — thấy ngay FE gọi API nào, khớp với chặng 5.
