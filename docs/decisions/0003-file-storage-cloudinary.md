# 0003 — Lưu file: Cloudinary + local fallback

- **Status:** Accepted
- **Date:** 2026-06-19
- **Phạm vi:** Toàn hệ thống (module dùng chung)

## Bối cảnh
Cần lưu ảnh (logo CLB, avatar, media gallery, đính kèm task) và file upload chung.

## Quyết định
Ảnh dùng **Cloudinary** (`CloudinaryStorageService`). File upload chung qua `FileUploadHelper` → lưu vào `/uploads`, trả về **relative path** (không trả URL tuyệt đối).

## Lý do
- Cloudinary lo việc lưu trữ/CDN/biến đổi ảnh, giảm tải cho server.
- Trả relative path giúp đổi host/domain không phải migrate dữ liệu đường dẫn.

## Hệ quả
- Tích cực: ảnh có CDN, server gọn.
- Đánh đổi: phụ thuộc dịch vụ ngoài (cần cấu hình credential Cloudinary); cần thống nhất khi nào dùng Cloudinary vs `/uploads` local.
