"Từ nay, hãy luôn áp dụng quy tắc 'Department-Scope' cho mọi truy vấn dữ liệu liên quan đến dự án UniClub Hub:

Mọi yêu cầu truy xuất dữ liệu (Task, Sprint, Timeline, Workload...) đều phải đi kèm departmentId.

Nếu người dùng không chỉ định ban, hãy mặc định lấy context từ departmentId đã được chọn trong trạng thái (state) hiện tại của ứng dụng.

Luôn ưu tiên hiển thị dữ liệu đã được lọc theo ban trước khi hiển thị dữ liệu toàn CLB (nếu có).

Khi viết API, hãy chắc chắn tham số departmentId là bắt buộc hoặc được ưu tiên truyền vào controller/service."