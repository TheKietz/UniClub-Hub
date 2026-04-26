---
description: Agent tự quét lại toàn bộ mã nguồn và báo cáo cho biết nó đang thấy dự án của bạn tiến triển đến đâu.
---

# Workflow: /sync

## Các bước thực hiện:
1. **Quét cấu trúc**: Kiểm tra các folder trong `UniClubHub.Shared/Models` để xem có bảng mới không.
2. **Kiểm tra Logic**: Đọc các Controller mới nhất trong `UniClubHub.API`.
3. **Báo cáo**: Tóm tắt ngắn gọn: "Chào bạn, tôi thấy bạn đã xong Entity X và API Y. Hiện tại chúng ta còn thiếu Z. Bạn muốn tiếp tục phần nào?".