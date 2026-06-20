# Architecture Decision Records (ADR)

Ghi lại **các quyết định kiến trúc quan trọng** kèm lý do, để người mới (và agent) hiểu *tại sao* hệ thống được làm như vậy — không chỉ *làm như thế nào*.

## Khi nào thêm ADR
Chỉ thêm khi có quyết định thực sự ảnh hưởng kiến trúc/cross-cutting: chọn công nghệ, đổi mô hình dữ liệu lớn, hoãn/bỏ một tính năng dùng chung, quy ước bắt buộc toàn hệ thống. **Không** dùng cho bugfix/refactor nhỏ.

## Quy ước
- File: `NNNN-tieu-de-ngan.md` (số tăng dần, ví dụ `0001-...`).
- Dùng `_template.md` làm khung.
- ADR là **append-only**: không xoá. Khi quyết định cũ bị thay, tạo ADR mới và đánh dấu cái cũ là `Superseded by 00XX`.

## Danh sách
- [0001 — Modular monolith dùng chung database](0001-modular-monolith-shared-db.md)
- [0002 — Auth: JWT + refresh token; hoãn Google OAuth & xác thực email](0002-auth-jwt-defer-oauth.md)
- [0003 — Lưu file: Cloudinary + local fallback](0003-file-storage-cloudinary.md)
