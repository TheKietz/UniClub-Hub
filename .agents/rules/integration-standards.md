---
trigger: always_on
---

# Integration Standards
- **Naming**: Backend dùng PascalCase, Frontend dùng camelCase. AI phải tự convert khi map dữ liệu.
- **Error Handling**: Backend trả về `ProblemDetails` chuẩn, Frontend phải có bộ lọc để hiển thị Toast thông báo lỗi cho người dùng.
- **Loading State**: Mọi tác vụ gọi API ở Frontend phải có trạng thái Loading để tránh người dùng bấm liên tục.