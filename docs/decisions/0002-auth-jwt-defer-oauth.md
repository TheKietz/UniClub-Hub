# 0002 — Auth: JWT + refresh token; hoãn Google OAuth & xác thực email

- **Status:** Accepted
- **Date:** 2026-06-19
- **Phạm vi:** Toàn hệ thống (module dùng chung)

## Bối cảnh
Cần xác thực cho cả 3 phân hệ. Có cân nhắc đăng ký qua Google OAuth và xác thực email khi đăng ký.

## Quyết định
Dùng **ASP.NET Core Identity + JWT Bearer**, kèm **refresh token** (entity `RefreshToken`). Mật khẩu tối thiểu 6 ký tự. Email gửi qua SendGrid (đã wired).

**Hoãn làm sau:** đăng ký bằng Google OAuth và xác thực email bắt buộc khi đăng ký — đã có DTO/scaffold (`GoogleLoginDto`, luồng email) nhưng chưa bật như tính năng chính.

## Lý do
- JWT + refresh phủ nhu cầu xác thực cốt lõi, không phụ thuộc nhà cung cấp ngoài.
- OAuth/xác thực email là cải tiến UX, chưa chặn các luồng nghiệp vụ chính → ưu tiên sau.

## Hệ quả
- Tích cực: luồng auth chạy được ngay, độc lập.
- Đánh đổi: tài khoản chưa bắt buộc verify email; còn cấu hình **giới hạn domain email được phép đăng ký** (Super Admin) dự kiến làm sau.
