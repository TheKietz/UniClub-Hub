**Hệ thống quản lý câu lạc bộ sinh viên và cổng thông tin giới thiệu hoạt động câu lạc bộ trong môi trường đại học**

1. **Tổng quan:**   
- Dự án website giúp quản lý các CLB, các lĩnh vực. Giúp các CLB thiết lập ban chức năng, quản lý công việc, thành viên, sự kiện, tin tức, landing page… Cho phép thành viên quản lý thông tin, công việc, đóng góp cá nhân và cho phép người dùng vãng lai có thể vào trang web xem thông tin về các CLB và đăng ký tham gia CLB qua form ứng tuyển trong mỗi landing page.

2. **Các chức năng của dự án:** 

**1\. Phân hệ Quản trị Hệ thống (Dành cho Super Admin)**  
Đây là nơi Đoàn trường hoặc Quản trị viên đại học kiểm soát toàn bộ môi trường.

* **Quản lý danh mục Câu lạc bộ (CLB):**  
  * Thêm mới/Kích hoạt/Khóa hoạt động của một CLB.  
  * Thiết lập các thông tin cốt lõi: Mã CLB, giảng viên phụ trách, trạng thái.  
* **Quản lý Danh mục Lĩnh vực:** Tạo các loại hình như Học thuật, Thể thao, Văn nghệ...  
* **Quản trị Người dùng hệ thống:** Cấp tài khoản ban đầu cho Chủ nhiệm CLB (Club\_Admin).   
* **Thống kê Tổng thể:** Xem báo cáo toàn trường về số lượng CLB, tổng sinh viên tham gia và hiệu quả hoạt động chung.

**2\. Phân hệ Quản trị CLB (Dành cho Club Admin & Manager)**  
Đây là phân hệ phức tạp nhất, tập trung vào quản lý nội bộ và vận hành.

### **A. CLUB\_ADMIN (Chủ nhiệm / Quản trị CLB)**

Đây là người sở hữu quyền hạn cao nhất trong phạm vi một CLB.

* **Quản lý Cơ cấu Tổ chức:**  
  * Tạo mới, chỉnh sửa hoặc xóa các **Ban chức năng** (Departments).  
* **Quản lý Nhân sự Cấp cao:**  
  * Bổ nhiệm hoặc bãi nhiệm **Trưởng ban** (DEPT\_LEAD) và **Phó ban** (DEPT\_DEPUTY).  
  * Điều chuyển thành viên giữa các ban.  
* **Quản lý Landing Page (CMS):**  
  * Chỉnh sửa toàn bộ nội dung trang giới thiệu: Banner, Sứ mệnh, Tầm nhìn, Thành tích.  
* **Quản lý Tuyển dụng:**  
  * Xây dựng bộ câu hỏi cho **Form đăng ký** gia nhập CLB.  
  * Phê duyệt cuối cùng các đơn đăng ký của sinh viên (Accepted/Rejected).  
* **Quản lý Vận hành & Tài chính:**  
  * Khởi tạo các **Sự kiện** lớn của CLB.  
  * Phê duyệt các bài viết truyền thông trước khi cho phép hiển thị công khai.  
  * Xem báo cáo tổng thể về hiệu suất của tất cả các Ban.

  ### **B. DEPT\_LEAD (Trưởng ban)**

Quyền hạn của Trưởng ban tập trung vào việc **điều hành chuyên môn** và **quản lý thành viên** trong ban của mình.

* **Quản lý Thành viên trong Ban:**  
  * Tiếp nhận thành viên mới từ Club Admin và gán vào các vị trí cụ thể trong ban.  
  * Theo dõi tình trạng hoạt động của thành viên trong ban mình quản lý.  
* **Quản lý Công việc (Task Management):**  
  * **Tạo Task:** Chia nhỏ các hạng mục công việc cho sự kiện hoặc hoạt động thường nhật.  
  * **Phân công:** Giao task cho thành viên (MEMBER) hoặc Phó ban (DEPT\_DEPUTY).  
  * **Kiểm soát chất lượng:** Kiểm tra kết quả công việc thành viên nộp lên.  
  * **Phê duyệt Task:** Xác nhận "Hoàn thành" để hệ thống tự động tính điểm đóng góp cho thành viên.  
* **Quản lý Nội dung chuyên môn:**  
  * Soạn thảo các bài viết, tin tức liên quan đến hoạt động của ban mình.  
  * Quản lý thư viện hình ảnh/video của các sự kiện mà ban mình phụ trách chính.  
* **Báo cáo & Đánh giá:**  
  * Đánh giá mức độ hoàn thành nhiệm vụ của thành viên trong ban để báo cáo lên Club Admin.

**3\. Phân hệ Dành cho Thành viên CLB**  
Tập trung vào sự tương tác và báo cáo kết quả công việc.

* **Dashboard cá nhân:** Xem danh sách CLB mình tham gia và vai trò tương ứng.  
* **Quản lý Công việc cá nhân:** Xem danh sách Task được giao**.**  
  * Cập nhật tiến độ, ghi chú kết quả hoàn thành hoặc gửi file đính kèm.  
* **Tham gia Sự kiện**: Nhận thông báo và xác nhận tham gia các hoạt động nội bộ.  
* **Theo dõi đóng góp:** Xem lịch sử hoạt động và điểm tích lũy/đóng góp của bản thân.

**4\. Phân hệ Public Portal (Dành cho Sinh viên/Khách)**  
Phục vụ mục đích truyền thông và kết nối.

* **Khám phá CLB:** Xem danh sách, tìm kiếm và lọc CLB theo lĩnh vực.  
* **Trang Landing Page CLB:** Xem thông tin giới thiệu, cơ cấu tổ chức, thành tích.  
  * Đọc tin tức, xem thư viện hình ảnh/video sự kiện.  
* **Đăng ký tham gia:** Nộp đơn trực tuyến qua Form tuyển.  
  * Theo dõi trạng thái duyệt đơn (Pending/Approved).  
* **Đăng ký Sự kiện:** Đăng ký tham gia các sự kiện mở (workshop, hội thao) do CLB tổ chức.

**5\. Phân hệ Thống kê & Báo cáo (Dành cho Admin & Manager)**  
Sử dụng dữ liệu để đánh giá hiệu quả.

* **Thống kê nhân sự:** Biểu đồ cơ cấu thành viên theo ban, biến động số lượng thành viên.  
* **Báo cáo công việc:** Tỷ lệ hoàn thành task đúng hạn, phân tích năng suất của từng Ban.  
* **Báo cáo sự kiện:** Số lượng người tham gia thực tế so với đăng ký, hiệu quả truyền thông bài viết.  
* **Đánh giá thành viên:** Xuất danh sách thành viên tích cực dựa trên điểm đóng góp (từ bảng member\_contributions).

3. **Các bảng trong cơ sở dữ liệu:**   
1. **Roles:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL | PRIMARY KEY |  |
| role\_name | VARCHAR(50) | UNIQUE, NOT NULL | SUPER\_ADMIN, CLUB\_ADMIN, DEPT\_LEAD, MEMBER, GUESS |

2. **Users:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PRIMARY KEY | Dùng UUID để bảo mật hơn SERIAL |
| student\_id | VARCHAR(20) | UNIQUE, NOT NULL | Mã SV |
| email  | VARCHAR(100) | UNIQUE, NOTNULL |  |
| password | TEXT | NOT NULL |  |
| full\_name | VARCHAR(100) | NOT NULL |  |
| avatar\_url | TEXT |  |  |
| phone | VARCHAR(15) |  |  |
| role\_id | INTEGER | FK(roles.id) |  |

3. **Clubs:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| name  | VARCHAR(255) | NOT NULL |  |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Mã CLB (VD: IT\_CLUB) |
| category | INTEGER | FK(categories.id) |  |
| logo\_url  | TEXT |  |  |
| description | TEXT |  |  |
| contact\_info | TEXT |  |  |
| established\_date | DATE |  |  |
| status  | VARCHAR | DEFAULT ‘Active’ |  |
| advisor\_name | VARCHAR(100 |  | Tên giáo viên quản lý/hướng dẫn |
| form\_schema | JSONB |  | Cấu trúc form tuyển thành viên |

4. **Departments:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| club\_id | INTEGER | FK(clubs.id) | Thuộc CLB nào |
| name | VARCHAR(100) | NOT NULL |  |
| description | TEXT |  |  |

5. **Club\_memberships:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| user\_id | UUID | FK(users.id) |  |
| club\_id | INTEGER | FK(clubs.id) |  |
| department\_id | INTEGER | FK(departments.id) | Ban tham gia |
| specific\_role\_id | INTEGER | FK(roles.id) | Chức vụ trong CLB (Lead, Member) |
| joined\_date | DATE | DEFAULT NOW() |  |
| status | VARCHAR(20) | DEFAULT ‘Active’ | Active/Resigned |

6. **Landing\_pages:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| club\_id | INTEGER | FK(clubs.id) |  |
| hero\_image | TEXT |  | Ảnh bìa |
| introduction | TEXT |  | Lời giới thiệu |
| mission | TEXT |  | Sứ mệnh |
| vision | TEXT |  | Tầm nhìn |
| social\_links | JSONB |  | Link FB, Zalo,... |
| layout\_settings | JSONB |  | Cấu hình màu sắc, thứ tự section |

7. **Posts:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| club\_id | INTEGER | FK(clubs.id) |  |
| author\_id | UUID | FK(users.id) |  |
| title | VARCHAR(255) | NOT NULL |  |
| content | TEXT | NOT NULL | Nội dung (HTML/Markdown) |
| thumbnail\_url | TEXT |  |  |
| category | VARCHAR(50) |  | News/Announcement |
| is\_published | BOOLEAN | DEFAULT FALSE | Trạng thái duyệt bài |
| created\_at | TIMESTAMP | DEFAULT NOW() |  |

8. **Media\_galleries:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| club\_id | INTEGER | FK(clubs.id) |  |
| media\_url | TEXT | NOT NULL |  |
| media\_type | VARCHAR(20) |  | Image/Video |
| description | VARCHAR(255) |  |  |

9. **Events:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| club\_id | INTEGER | FK(clubs.id) |  |
| name | VARCHAR(255) | NOT NULL |  |
| description | TEXT |  |  |
| location | VARCHAR(255) |  |  |
| start\_time | TIMESTAMP |  |  |
| end\_time | TIMESTAMP |  |  |
| max\_participants | INTEGER |  |  |
| status | VARCHAR(20) |  |  |

10. **Event\_registrations:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| event\_id | INTEGER | FK(events.id) |  |
| user\_id | UUID | FK(users.id) |  |
| registered\_at | TIMESTAMP | DEFAULT NOW() |  |
| attendance | VARCHAR(20) | DEFAULT ‘Pending’ | Checked-in/Absent |

11. **Tasks:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| club\_id | INTEGER | FK(clubs.id) |  |
| event\_id | INTEGER | FK(events.id) | Task thuộc sự kiện |
| title | VARCHAR(255) | NOT NULL |  |
| description | TEXT |  |  |
| priority | VARCHAR(20) |  | Low/Med/High |
| deadline | TIMESTAMP |  |  |
| status | VARCHAR(20) |  | To-do, Doing, Done |
| assigned\_to | UUID | FK(users.id) | Người thực hiện |

12. **Applications:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| user\_id | UUID | FK(users.id) |  |
| club\_id | INTEGER | FK(clubs.id) |  |
| answers | JSONB |  |  |
| status | VARCHAR(20) | DEFAULT ‘Pending’ | Pending/Interview/Accepted/Rejected |
| applied\_at | TIMESTAMP | DEFAULT NOW() |  |

13. **contributions:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| user\_id | UUID | FK(users.id) |  |
| club\_id | INTEGER | FK(clubs.id) |  |
| activity\_type | VARCHAR(50) |  | Loại (Task/Event/Post) |
| points | INTEGER |  | Điểm cộng tích lũy |
| recorded\_at | TIMESTAMP | DEFAULT NOW() |  |

14. **categories:**

| Column | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | SERIAL  | PRIMARY KEY |  |
| name | VARCHAR(100) | UNIQUE, NOT NULL |  |
| description | TEXT |  | Mô tả đặc điểm của lĩnh vực này |

4. **Modules công việc:** 

**Phụ trách:** Luồng đăng ký đăng nhập, phân quyền và phần quản lý của trưởng CLB.

### **Module 1: Quản trị Chiến lược & Nền tảng (The Strategist)**

* **Auth & Core:** Code hệ thống Đăng nhập/Đăng ký, Middleware phân quyền (Xác định ai là Admin, ai là Lead).  
* **CLUB\_ADMIN (Quản trị CLB):**  
  * Quản lý Cơ cấu (Tạo Ban), Nhân sự cấp cao (Bổ nhiệm Trưởng ban).  
  * Quản lý Landing Page (Banner, Sứ mệnh, Thành tích).  
  * Quản lý Tuyển dụng (Thiết kế Form JSONB, Duyệt đơn SV).  
  * Khởi tạo Sự kiện lớn.

### **Module 2: Quản trị Vận hành & Hệ thống (The Operator)**

**Phụ trách:** Luồng công việc hàng ngày của Ban và Quản trị cấp trường.

* **SUPER\_ADMIN (Quản trị Hệ thống):**  
  * CRUD Danh mục lĩnh vực, Quản lý/Khóa các CLB toàn trường.  
  * Quản lý người dùng hệ thống.  
* **DEPT\_LEAD (Trưởng ban):**  
  * Quản lý thành viên trong Ban, giao Task, duyệt Task (Bảng Kanban).  
  * Soạn thảo bài viết, tin tức, thư viện ảnh cho Ban.  
  * Viết báo cáo đánh giá thành viên trong Ban.

### **Module 3: Tương tác Sinh viên & Phân tích (The User Experience & Data)**

**Phụ trách:** Toàn bộ giao diện cho người dùng cuối và đầu ra dữ liệu.

* Public Portal (Guest): Trang chủ khám phá CLB, lọc theo lĩnh vực, xem Landing Page, nộp đơn đăng ký.  
* Member View: Dashboard cá nhân, nhận Task, báo cáo tiến độ Task, xem lịch sử đóng góp.  
* Hệ thống Thống kê & Báo cáo: Code các logic truy vấn dữ liệu phức tạp để vẽ biểu đồ ([Chart.js/Recharts](http://Chart.js/Recharts)).  
* Xuất báo cáo hiệu quả công việc, nhân sự, sự kiện (dùng dữ liệu từ cả Module 1 và 2).

