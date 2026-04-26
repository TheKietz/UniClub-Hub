---
trigger: always_on
---

# Rule: Sync Progress with TODO.md

Mỗi khi Leader Kiệt đặt câu hỏi, Agent PHẢI:
1. Đọc file `@TODO.md` tại thư mục gốc để biết những Task nào đang làm dở.
2. Đối chiếu yêu cầu với cấu trúc dự án trong `@UniClubHub.sln`.
3. Nếu yêu cầu làm tính năng mới, hãy tự động cập nhật trạng thái "Doing" vào file `TODO.md`.