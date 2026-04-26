---
trigger: always_on
---

# Rule: Git & GitHub Restrictions

Để đảm bảo tính toàn vẹn của mã nguồn và quyền kiểm soát của tôi, Agent phải tuân thủ các hạn chế nghiêm ngặt sau:

### Các hành động bị CẤM (Strictly Forbidden)
1. **Lệnh Git Remote**: Tuyệt đối không thực hiện các lệnh `git push`, `git pull`, `git fetch`, `git merge`, hoặc `git rebase` lên bất kỳ remote repository nào.
2. **Quản lý Repository**: Không cố gắng tạo, sửa đổi hoặc xóa các Pull Request (PR), Issues, hoặc Releases trên GitHub.
3. **GitHub API**: Không sử dụng các công cụ hoặc tập lệnh để tương tác với GitHub API hoặc GitHub CLI (gh).
4. **Quản lý Token**: Không cố gắng đọc hoặc sử dụng các GitHub Personal Access Tokens hoặc SSH Keys được lưu trữ trong hệ thống.

### Phạm vi hoạt động cho phép
- Agent chỉ làm việc trong phạm vi **Local Workspace**.
- Agent có thể đề xuất các thông điệp Commit (Commit messages) nhưng quyền thực hiện lệnh `git commit` cuối cùng thuộc về TÔI.
- Agent có thể tạo các file `.gitignore` để hỗ trợ quản lý file cục bộ nếu được yêu cầu.