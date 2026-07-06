MODULE DÙNG CHUNG (Áp dụng cho cả 3 đề tài)
[x] Xác thực & quản lý người dùng (đăng nhập, JWT/session)
[x] Phân quyền RBAC (Admin, Quản lý CLB, Trưởng ban, Thành viên, User công khai)
[x] Danh mục hệ thống (trạng thái, loại hoạt động, mức ưu tiên, lĩnh vực CLB)
[x] Upload & quản lý tệp (ảnh, tài liệu) — Cloudinary
[x] Logging, audit log, xử lý lỗi — tự động qua DbContext.SaveChangesAsync
[x] Notification (web) — chuông thông báo real-time trong app, đánh dấu đã đọc
[x] Kiến trúc nhiều lớp (layered/clean), API dùng chung, CSDL dùng chung

ĐỀ TÀI 1: Xây dựng hệ thống quản lý câu lạc bộ, thành viên và cơ cấu tổ chức trong môi trường đại học
1. Nội dung thực hiện

Đề tài tập trung nghiên cứu, phân tích, thiết kế và xây dựng phân hệ quản lý dữ liệu lõi của các câu lạc bộ sinh viên. Hệ thống cho phép quản lý thông tin câu lạc bộ, cơ cấu tổ chức, thành viên và vai trò của từng cá nhân; đồng thời theo dõi quá trình tham gia và mức độ đóng góp của thành viên.

Phân hệ đóng vai trò nền tảng dữ liệu, cung cấp thông tin chuẩn hóa cho các phân hệ vận hành và cổng thông tin.

2. Yêu cầu chức năng
[x] Sinh viên có thể xem danh sách câu lạc bộ, có thể đăng ký, duyệt, từ chối,...
[x] Quản lý câu lạc bộ:
    [x] Tạo, cập nhật, xóa, tra cứu
    [x] Thông tin: tên, mã, mô tả, lĩnh vực, logo, ngày thành lập, giảng viên phụ trách, trạng thái
[x] Quản lý cơ cấu tổ chức:
    [x] Ban chủ nhiệm, các ban chức năng
    [x] Vai trò trong từng ban (CLUB_ADMIN, DEPT_LEAD, MEMBER)
[x] Quản lý thành viên:
    [x] Thêm, sửa, xóa, tra cứu
    [x] Phân loại theo CLB, ban, vai trò
    [x] Phân quyền theo vai trò người dùng
    [x] Tra cứu danh sách thành viên theo nhiều tiêu chí (search, filter, sort)
[x] Quản lý đa CLB trong hệ thống
[x] Theo dõi lịch sử tham gia của thành viên
[x] Quản lý vòng đời thành viên (ứng tuyển → thử việc → chính thức → rời CLB)
[x] Hệ thống đánh giá thành viên (KPI nội bộ) — cấu hình tiêu chí/xếp loại, bảng điểm CLB, KPI cá nhân (`/my-kpi`)
[x] Import/Export dữ liệu (Excel/CSV)
[x] Audit log theo dõi thay đổi — tự động qua DbContext
[x] Gợi ý phân công vai trò (rule-based + Gemini AI fallback) — dialog trên trang thành viên, quyền `membership.role_suggestions.use`
[x] Thống kê - Báo cáo (biểu đồ tăng trưởng, phân bổ vai trò, đơn đăng ký, top CLB)
3. Yêu cầu phi chức năng
[x] Bảo mật dữ liệu và phân quyền truy cập
[x] Hiệu năng ổn định với số lượng lớn thành viên
[x] Thiết kế theo layered/clean architecture
[x] Dễ mở rộng và tích hợp
4. Triển khai và đánh giá
[x] Xây dựng hệ thống web hoàn chỉnh
[ ] Kiểm thử chức năng và dữ liệu
[ ] Đánh giá hiệu quả quản lý tổ chức CLB

ĐỀ TÀI 2
Tên đề tài

Xây dựng hệ thống quản lý hoạt động, sự kiện và công việc nội bộ của câu lạc bộ sinh viên

1. Nội dung thực hiện

Đề tài tập trung xây dựng phân hệ quản lý vận hành nội bộ của câu lạc bộ, bao gồm quản lý hoạt động, sự kiện và công việc. Hệ thống hỗ trợ lập kế hoạch, phân công nhiệm vụ, theo dõi tiến độ và đánh giá hiệu quả thực hiện.

Phân hệ phản ánh toàn bộ quá trình tổ chức và triển khai hoạt động của câu lạc bộ.

2. Yêu cầu chức năng
Quản lý hoạt động, sự kiện:
Tạo, chỉnh sửa, xóa
Thời gian, địa điểm, nội dung
Quản lý công việc:
Tạo, phân công nhiệm vụ
Gán người thực hiện
Deadline, trạng thái
Theo dõi tiến độ công việc
Quản lý danh sách người tham gia
Tra cứu hoạt động và công việc
Công việc cha – con, phụ thuộc công việc
Hiển thị Kanban, Calendar, Timeline
Gantt chart cho sự kiện
Workflow quy trình hoạt động
Nhắc việc tự động
Phân bổ workload
Theo dõi tiến độ (%)
Realtime cập nhật trạng thái (SignalR/WebSocket)
Dashboard nội bộ
Activity log
Quản lý sprint (Agile nhẹ)
Gợi ý phân công công việc
Dự đoán trễ deadline
Đề xuất ưu tiên
3. Yêu cầu phi chức năng
Hỗ trợ nhiều người dùng đồng thời
Không mất dữ liệu khi mất kết nối
Hiệu năng tốt với realtime
Khả năng mở rộng
4. Triển khai và đánh giá
Kiểm thử nghiệp vụ vận hành
Đánh giá hiệu quả quản lý hoạt động
So sánh trước và sau khi áp dụng hệ thống

ĐỀ TÀI 3: Xây dựng cổng thông tin và hệ thống truyền thông giới thiệu hoạt động câu lạc bộ sinh viên

1. Nội dung thực hiện

Đề tài tập trung xây dựng cổng thông tin công khai cho các câu lạc bộ, bao gồm landing page, hệ thống quản lý nội dung và chức năng đăng ký tham gia.

Phân hệ giúp quảng bá hình ảnh CLB và kết nối sinh viên với hoạt động câu lạc bộ.

2. Yêu cầu chức năng
Landing page CLB:
Giới thiệu CLB
Cơ cấu tổ chức (hiển thị)
Hoạt động

Quản lý nội dung:
Bài viết, tin tức
Hình ảnh, video
Hiển thị danh sách CLB
Đăng ký tham gia CLB
Quản lý đơn đăng ký
Tra cứu thông tin CLB
CMS quản lý nội dung động
Template landing page
SEO cơ bản
Phân quyền nội dung (editor/reviewer)
Duyệt nội dung nhiều cấp
Analytics (lượt truy cập, tương tác)
Tích hợp mạng xã hội
Recommendation CLB (AI nhẹ)
Notification (email/web)
Dashboard truyền thông
3. Yêu cầu phi chức năng
Tối ưu tốc độ tải trang
Responsive đa thiết bị
Cache dữ liệu
Có thể triển khai cloud
4. Triển khai và đánh giá
Triển khai website thực tế
Đánh giá trải nghiệm người dùng
Đánh giá hiệu quả truyền thông
