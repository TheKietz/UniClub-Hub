## Task Tracking — Đề tài 1 (Membership)

| Status   | Task                                                                      |
|----------|---------------------------------------------------------------------------|
| [x] Done | Trang báo cáo CLB (`/clubs/:id/manage/report`) — 7 sections, print-to-PDF |
| [x] Done | Trang báo cáo hệ thống admin (`/admin/report`) — 6 sections, print-to-PDF |
| [x] Done | Nâng cấp Org chart |
| [x] Done | Tự cấu hình tiêu chí KPI (KpiConfigPage) + dashboard KPI + trang KPI cá nhân |
| [~] Doing | Role suggestion (AI phân công role) — Gemini đã wired, cần data KPI thật để gợi ý có ý nghĩa |
| [ ] Todo | KPI tích hợp dữ liệu Đề tài 2 (Operations task tracking) để tự tính điểm hoạt động |
| [x] Done | Kiểm thử (Unit Test các service chính) |
| [x] Todo | Nâng cấp Search & Sort trên các trang quản lý (Members, Users, Clubs, Applications) |
| [x] Todo | Feature Permission System — CLUB_ADMIN/SUPER_ADMIN giới hạn chức năng cấp dưới |
| [x] Todo | Email Domain Restriction — Super Admin cấu hình domain email được phép đăng ký |
| [ ] Todo | Dọn việc sau merge Đề tài 2 — link ClubAdminLayout, filter DEPT_LEAD, Department-Scope cho query |

---

"Từ nay, hãy luôn áp dụng quy tắc 'Department-Scope' cho mọi truy vấn dữ liệu liên quan đến dự án UniClub Hub:

Mọi yêu cầu truy xuất dữ liệu (Task, Sprint, Timeline, Workload...) đều phải đi kèm departmentId.

Nếu người dùng không chỉ định ban, hãy mặc định lấy context từ departmentId đã được chọn trong trạng thái (state) hiện tại của ứng dụng.

Luôn ưu tiên hiển thị dữ liệu đã được lọc theo ban trước khi hiển thị dữ liệu toàn CLB (nếu có).

Khi viết API, hãy chắc chắn tham số departmentId là bắt buộc hoặc được ưu tiên truyền vào controller/service."