# UniClub Hub — Operations Module: Kế hoạch cải thiện

## Tổng hợp việc cần làm

- [~] Sprint 1 — Hệ thống thông báo chủ động (in-app) + Nhắc việc tự động
- [ ] Sprint 2 — Unit Test cho Service Layer
- [ ] Sprint 3 — Trang KPI cá nhân đầy đủ (/my-kpi)
- [ ] Sprint 4 — Export báo cáo Excel/PDF
- [ ] Sprint 5 — Dự báo trễ deadline (rule-based) + Mở rộng SignalR

---

## Sprint 1 — Notification & Reminder

**Mục tiêu:** Người dùng nhận thông báo kịp thời mà không cần chủ động vào hệ thống.

### Backend

#### 1. Cập nhật Model `Notification` trong Shared
- [ ] Thêm 3 field vào `UniClub-Hub.Shared/Models/Notification.cs`:
  - `Body` (string?) — nội dung mở rộng
  - `RelatedEntityType` (string?) — "Task" | "Event" | "Assignment" | "Sprint"
  - `RelatedEntityId` (int?) — Id của entity liên quan
- [ ] Tạo migration: `dotnet ef migrations add AddNotificationNavigation`
- [ ] Chạy `dotnet ef database update`

#### 2. Cập nhật `NotificationDto` trong Membership
- [ ] Thêm vào `UniClub-Hub.Membership/DTOs/Notification/NotificationDto.cs`:
  - `Body` (string?)
  - `RelatedEntityType` (string?)
  - `RelatedEntityId` (int?)
  - `NavigationUrl` (string?) — tính sẵn phía server, Frontend dùng để navigate

#### 3. Cập nhật `INotificationService` trong Shared
- [ ] Cập nhật signature `SendAsync` tại `UniClub-Hub.Shared/Interfaces/INotificationService.cs`:
  ```
  Task SendAsync(
      string userId,
      string title,
      string message,
      NotificationType type = NotificationType.System,
      string? body = null,
      string? relatedEntityType = null,
      int? relatedEntityId = null)
  ```

#### 4. Cập nhật `NotificationService` trong Membership
- [ ] Cập nhật `SendAsync` theo signature mới, lưu đủ 3 field mới
- [ ] Thêm private method `BuildNavigationUrl(entityType, entityId)`:
  - `"Task"` → `/tasks/{id}`
  - `"Event"` → `/events/{id}`
  - `"Assignment"` → `/assignments/inbox`
  - `"Sprint"` → `/sprints/{id}`
- [ ] Cập nhật `Select` trong `GetMyNotificationsAsync` để map thêm:
  - `Body`, `RelatedEntityType`, `RelatedEntityId`
  - `NavigationUrl` = gọi `BuildNavigationUrl()`

#### 5. Bổ sung `NotificationType` enum trong Shared
- [ ] Kiểm tra và bổ sung vào `UniClub-Hub.Shared/Enums/NotificationType.cs`:
  - `TaskAssigned`
  - `TaskStatusUpdated`
  - `DeadlineReminder`
  - `AssignmentReceived`

#### 6. Gọi `SendAsync` tại các điểm trigger trong Operations

- [ ] `TaskService.CreateTaskAsync` — sau khi lưu task:
  - Gửi đến `task.AssignedTo` (nếu có)
  - Type: `TaskAssigned`, RelatedEntityType: `"Task"`, RelatedEntityId: `task.Id`

- [ ] `TaskService.AddAssigneeAsync` — sau khi thêm assignee:
  - Gửi đến `dto.UserId`
  - Type: `TaskAssigned`, RelatedEntityType: `"Task"`, RelatedEntityId: `task.Id`

- [ ] `TaskService.UpdateStatusAsync` — sau khi lưu:
  - Gửi đến `task.AssignedTo` (nếu có)
  - Type: `TaskStatusUpdated`, RelatedEntityType: `"Task"`, RelatedEntityId: `task.Id`

- [ ] `AssignmentService.CreateAssignmentAsync` — sau khi lưu:
  - Query Club Admin của `ClubId` nhận việc
  - Gửi đến Club Admin đó
  - Type: `AssignmentReceived`, RelatedEntityType: `"Assignment"`, RelatedEntityId: `assignment.Id`

#### 7. Tạo `ReminderHostedService`
- [ ] Tạo file `UniClub-Hub.Server/BackgroundServices/ReminderHostedService.cs`
- [ ] Implement `BackgroundService`, dùng `IServiceScopeFactory` để resolve scoped services
- [ ] Logic chạy mỗi 1 giờ:
  - Query `ClubTasks` có `Deadline` trong khoảng `(now, now + 24h)`
  - Chưa Done (`Status != ClubTaskStatus.Done`)
  - Có `AssignedTo != null`
  - Gọi `SendAsync` với Type: `DeadlineReminder`, RelatedEntityType: `"Task"`
- [ ] Đăng ký trong `Program.cs`: `builder.Services.AddHostedService<ReminderHostedService>()`

#### 8. Phát SignalR realtime khi gửi thông báo
- [ ] Inject `IHubContext<KanbanHub>` vào `NotificationService`
- [ ] Trong `SendAsync`, sau khi `SaveChangesAsync`, gọi:
  ```
  _hubContext.Clients.User(userId).SendAsync("NotificationReceived", payload)
  ```
  với payload gồm: `{ id, title, message, type, navigationUrl }`
- [ ] Thêm `"NotificationReceived"` vào `SignalREvents.cs` trong Shared

### Frontend

#### 9. Hook `useNotificationSignalR`
- [ ] Tạo `src/shared/hooks/useNotificationSignalR.ts`
- [ ] Lắng nghe event `NotificationReceived` từ KanbanHub (dùng lại connection hiện tại)
- [ ] Khi nhận event: `queryClient.invalidateQueries(['notifications', 'unread-count'])`
- [ ] Hiển thị toast ngắn gọn (title của thông báo)

#### 10. Component chuông thông báo trên Navbar
- [ ] Tạo `src/shared/components/NotificationBell.tsx`
- [ ] Query `GET /api/notifications/unread-count` → hiển thị badge số đỏ
- [ ] Click mở dropdown, query `GET /api/notifications?page=1&pageSize=5`
- [ ] Mỗi item hiển thị: title, message, thời gian tương đối, trạng thái đã đọc (màu nền)
- [ ] Nút "Đánh dấu tất cả đã đọc" → `PATCH /api/notifications/read-all`
- [ ] Link "Xem tất cả" → `/notifications`

#### 11. Component `NotificationItem` với navigation
- [ ] Tạo `src/shared/components/NotificationItem.tsx`
- [ ] Click: gọi `PATCH /api/notifications/{id}/read` nếu chưa đọc
- [ ] Sau khi mark read: `navigate(notification.navigationUrl)` nếu có URL
- [ ] Hiển thị "Xem chi tiết →" chỉ khi `navigationUrl` không null

#### 12. Trang `/notifications`
- [ ] Tạo `src/modules/notifications/pages/NotificationsPage.tsx`
- [ ] Danh sách đầy đủ với phân trang
- [ ] Lọc theo trạng thái: Tất cả / Chưa đọc / Đã đọc
- [ ] Nút xóa từng thông báo → `DELETE /api/notifications/{id}`

---

## Sprint 2 — Unit Test cho Service Layer

**Mục tiêu:** Có bộ test tự động bảo vệ logic nghiệp vụ cốt lõi.

### Thiết lập
- [ ] Tạo/cập nhật project `UniClub-Hub.Tests` với các package:
  - `xUnit`
  - `Moq`
  - `FluentAssertions`
  - `Microsoft.EntityFrameworkCore.InMemory`
- [ ] Cấu hình InMemory DbContext cho test

### Test cases — `TaskService`
- [ ] `CreateTask_WithValidParentId_ShouldSucceed`
- [ ] `CreateTask_WithInvalidParentId_ShouldThrowNotFoundException`
- [ ] `UpdateStatus_ByAssignedMember_ShouldSucceed`
- [ ] `UpdateStatus_ByUnassignedMember_ShouldThrowForbidden`
- [ ] `UpdateStatus_ToDone_ShouldSetCompletedAtAndProgress100`

### Test cases — `AssignmentService`
- [ ] `CreateAssignment_WithDeadlineInEventRange_ShouldSucceed`
- [ ] `CreateAssignment_WithDeadlineOutOfRange_ShouldThrowValidationException`
- [ ] `ConvertToTask_WithPendingAssignment_ShouldCreateTaskAndSetInProgress`
- [ ] `ConvertToTask_WithDoneAssignment_ShouldThrowValidationException`

### Test cases — `KanbanService`
- [ ] `ReorderColumns_ShouldUpdateOrderCorrectly`

---

## Sprint 3 — Trang KPI cá nhân

**Mục tiêu:** Mỗi thành viên tự theo dõi được hiệu suất cá nhân.

### Backend
- [ ] Mở rộng endpoint `GET /api/v1/operations/kpi/me` trả về:
  - Tổng số công việc: được giao / đã hoàn thành / đang thực hiện / trễ deadline
  - Tỷ lệ hoàn thành đúng hạn (%)
  - Tổng `EstimatedHours` vs `ActualHours` theo từng tháng
  - Danh sách sự kiện đã tham gia
  - Top 3 loại công việc được giao nhiều nhất (theo Priority)

### Frontend
- [ ] Trang `/my-kpi` với các thành phần:
  - 4 widget thẻ số liệu tổng hợp
  - Biểu đồ đường: tiến độ hoàn thành theo tuần (`recharts LineChart`)
  - Biểu đồ cột: giờ ước tính vs thực tế theo tháng (`recharts BarChart`)
  - Bảng lịch sử công việc đã hoàn thành, có thể lọc theo khoảng thời gian

---

## Sprint 4 — Export báo cáo

**Mục tiêu:** Club Admin xuất được báo cáo gửi lên Ban Công tác Sinh viên.

### Backend
- [ ] Cài package `ClosedXML` (Excel) và `QuestPDF` (PDF) vào project Server
- [ ] Endpoint `GET /api/v1/operations/export/tasks?clubId=&from=&to=&format=xlsx|pdf`
- [ ] Endpoint `GET /api/v1/operations/export/kpi/departments/{id}?from=&to=`
- [ ] Endpoint `GET /api/v1/operations/export/audit-logs?from=&to=`
- [ ] Nội dung file xuất:
  - Sheet 1: Danh sách công việc (tiêu đề, người thực hiện, deadline, trạng thái, tiến độ)
  - Sheet 2: Tổng hợp workload theo thành viên
  - Sheet 3: Danh sách sự kiện và số lượng người tham gia

### Frontend
- [ ] Nút "Xuất báo cáo" trên trang Dashboard và trang Audit Log
- [ ] Dropdown chọn định dạng (Excel / PDF) và khoảng thời gian

---

## Sprint 5 — Dự báo trễ deadline & Mở rộng SignalR

**Mục tiêu:** Hệ thống chủ động cảnh báo nguy cơ trễ, SignalR bao phủ đầy đủ hơn.

### Dự báo trễ deadline (rule-based)
- [ ] Logic tính nguy cơ trễ:
  ```
  Ngưỡng kỳ vọng = (số ngày đã trôi qua / tổng số ngày) * 100
  Nguy cơ trễ    = (Progress < ngưỡng_kỳ_vọng) AND (còn <= 2 ngày)
  ```
- [ ] Endpoint `GET /api/v1/operations/tasks/at-risk?clubId=`
- [ ] Widget "Công việc có nguy cơ trễ" trên Dashboard (highlight màu cam)
- [ ] Tích hợp cảnh báo vào `ReminderHostedService` (đã xây ở Sprint 1)

### Mở rộng SignalR
- [ ] Thêm các event mới vào `UniClub-Hub.Shared/Constants/SignalREvents.cs`:
  - `CommentAdded` — phát khi có bình luận mới trên công việc
  - `AttachmentUploaded` — phát khi tệp đính kèm được thêm
  - `SprintStatusChanged` — phát khi Sprint chuyển trạng thái
  - `AssignmentReceived` — phát khi CLB nhận phiếu giao việc mới
- [ ] Gọi phát sóng tương ứng trong các Service (TaskService, SprintService, AssignmentService)
- [ ] Frontend: cập nhật `useKanbanSignalR` để lắng nghe thêm các event mới

---
