# Manual Test — Lint fix (membership/auth/shared)

> Checklist kiểm thử tay cho commit `fix(client): clear membership-scope ESLint and React Compiler violations`.
> Sắp theo mức rủi ro (làm từ trên xuống). Mỗi mục: cách làm + dấu hiệu PASS / 🔴 lỗi cần để ý.
> Mẹo: mở DevTools tab **Console** (bắt lỗi runtime) + **Network** (phát hiện double-fetch) khi click.

## A. Auth flow — blast radius lớn nhất (tách AuthContext + đổi import `useAuth`)
- [ ] Login tài khoản thường → vào được, header đúng tên/role
- [ ] Refresh (F5) khi đang đăng nhập → giữ session, không bị đá ra login
- [ ] Logout → về login, không truy cập được trang bảo vệ
- [ ] Register tài khoản mới → ra thông báo "kiểm tra email", luồng không vỡ
- [ ] ConfirmEmail / ResetPassword / CompleteProfile → mở được, submit chạy
- [ ] ProtectedRoute / ClubProtectedRoute → user thiếu quyền bị chặn đúng (forbidden)
- 🔴 trắng trang / lỗi `useAuth must be used inside AuthProvider` / mất session sau F5

## B. Cross-module smoke — module nhóm khác vẫn import `useAuth` từ AuthContext
- [ ] Mở 1–2 trang Operations (task/kanban) → load bình thường
- [ ] Mở Portal/Landing → load bình thường
- 🔴 trang Operations/Landing crash → re-export `useAuth` hỏng

## C. Paged lists — filter/search/sort/pagination (race + reset trang)
Áp cho: MembersPage, UsersPage, ClubsPage, ApplicationsPage, DepartmentsPage
- [ ] Gõ search → lọc đúng, tự về trang 1
- [ ] Đổi filter (role/status/department/category) → đúng, về trang 1
- [ ] Đổi sort (cột + chiều) → đúng, về trang 1
- [ ] Load more / chuyển trang → nối đúng, không trùng/mất item
- [ ] Gõ search nhanh liên tục rồi dừng → kết quả cuối khớp ô search
- 🔴 double-fetch (list nháy 2 lần), đổi filter vẫn ở trang cũ, kết quả không khớp search

## D. KPI — Pattern B derive state (MyKpiPage, KpiDashboardPage)
- [ ] MyKpiPage: vào trang → tự chọn club đầu, KPI hiện
- [ ] Đổi club ở dropdown → KPI cập nhật đúng club
- [ ] Đổi khoảng ngày (from/to) → KPI reload đúng
- [ ] Nút refresh → tải lại đúng
- [ ] KpiDashboardPage: load + đổi filter đúng
- 🔴 club không tự chọn, đổi club không đổi data, nhấp nháy, refresh vô tác dụng

## E. ClubSettingsPage — Pattern B (form khởi tạo từ data)
- [ ] Mở settings 1 CLB → form điền sẵn đúng giá trị hiện tại
- [ ] Sửa 1 field → lưu → reload → giá trị mới giữ đúng
- 🔴 form trống/reset sai khi load, mất giá trị đang nhập

## F. OrgChartPage — fix `ref` → `isDragging` + collapse
- [ ] Vào org chart → CLB/ban/thành viên load đúng
- [ ] Kéo (drag) canvas → con trỏ `grabbing` khi giữ, `grab` khi thả; canvas scroll theo
- [ ] Collapse/expand 1 ban → đóng/mở đúng
- [ ] Fit to screen hoạt động
- 🔴 con trỏ không đổi khi kéo, collapse sai ban

## G. Notifications (NotificationBell + NotificationsPage)
- [ ] Chuông: badge số chưa đọc đúng, mở dropdown thấy list
- [ ] Đánh dấu đã đọc → badge giảm
- [ ] NotificationsPage: list load đúng
- 🔴 badge sai, không load, không cập nhật khi đã đọc

## H. Charts (DashboardCharts — fix immutability)
- [ ] Trang có MiniDonut/biểu đồ (dashboard, KPI) → donut vẽ đúng tỉ lệ, không lệch/đè đoạn
- 🔴 các cung donut sai vị trí/chồng nhau

## I. Deferred-fetch còn lại (smoke: "load đúng, không lỗi console")
- [ ] MyActivityPage, MemberHistoryPage, ProfilePage, SupportPage, NotificationsPage
- [ ] AdminAuditLogPage, AdminPositionsPage, AdminResignationPage, AdminStructurePage, CategoriesPage, SupportAdminPage
- [ ] club/AuditLogPage, KpiConfigPage, ResignationPage, PositionManagementPanel
- [ ] MajorSelect: form có chọn ngành → list ngành hiện, chọn được
- 🔴 trắng trang / lỗi console khi mở

---

### Bộ tối thiểu trước khi merge (nếu ít thời gian)
A (login + F5 + logout) · B (1 trang Operations) · C (MembersPage: search + filter + sort về trang 1) · D (MyKpi đổi club) · E (ClubSettings load + save) · F (OrgChart drag)
