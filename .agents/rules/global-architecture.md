---
trigger: always_on
---

# Global Architecture Enforcement

Khi làm việc trong Solution này, AI Agent phải tuân thủ các ràng buộc sau:

### Cấm (Restrictions)
- **KHÔNG** tạo thư mục `Models` hay `Entities` bên trong các dự án Module.
- **KHÔNG** tạo tham chiếu trực tiếp giữa các Module với nhau (VD: Operations không được Reference Membership).

### Cho phép (Permissions)
- Chỉ được phép tham chiếu từ Module vào project `Shared`.
- Chỉ được phép tạo Entity mới sau khi đã được User phê duyệt cấu trúc.