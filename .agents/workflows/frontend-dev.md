---
description: Hướng dẫn Agent xây dựng UI components và kết nối API theo chuẩn Vercel.
---

## Các bước thực hiện:

Sử dụng các yêu cầu phi chức năng (Responsive, Tốc độ tải trang) trong @project-description.md để tối ưu giao diện

1. **Thiết kế Component Architecture**:
   - Sử dụng bộ skill `vercel-composition-patterns`.
   - **Quy tắc**: Áp dụng `architecture-avoid-boolean-props` và `architecture-compound-components` để component có thể tái sử dụng cao.

2. **Xây dựng Logic & State Management**:
   - Sử dụng `vercel-react-best-practices` để tối ưu re-render.
   - Áp dụng `state-lift-state` nếu dữ liệu cần chia sẻ giữa các component anh em.

3. **Kết nối API & Data Fetching**:
   - Sử dụng Axios instance và áp dụng `async-parallel` (Promise.all) để fetch dữ liệu song song, loại bỏ lỗi Waterfall.
   - Cấu hình hiển thị lỗi thân thiện dựa trên response từ Backend.

4. **Kiểm duyệt UI/UX & Accessibility**:
   - Sử dụng bộ skill `web-design-guidelines`.
   - **Hành động**: Chạy lệnh "Review UI" để kiểm tra tính tuân thủ về phím tắt (keyboard handlers), `aria-labels`, và độ tương phản.
   - Xuất báo cáo lỗi theo định dạng `file:line` để Kiệt sửa lỗi nhanh.

5. **Tối ưu hóa cuối cùng**:
   - Kiểm tra Bundle size bằng `bundle-barrel-imports` (import trực tiếp, không qua file index chung).