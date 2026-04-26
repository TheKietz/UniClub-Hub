---
trigger: always_on
---

# Database Safety Rules

AI Agent phải tuân thủ nghiêm ngặt các quy tắc sau khi đụng đến tầng dữ liệu:

1. **Quyền hạn**: AI KHÔNG được phép tự ý sửa file trong thư mục `UniClubHub.Shared/Entities/`.
2. **Quy trình phê duyệt**:
   - Bước 1: Đề xuất cấu trúc bảng/cột trong chat.
   - Bước 2: Chờ tôi xác nhận "Approve" hoặc "Đồng ý".
3. **Thực thi**: Tuyệt đối không chạy lệnh `dotnet ef database update`. Chỉ được phép gợi ý lệnh Migration để tôi tự chạy.