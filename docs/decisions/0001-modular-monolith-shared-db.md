# 0001 — Modular monolith dùng chung database

- **Status:** Accepted
- **Date:** 2026-06-19 (ghi lại quyết định đã phản ánh trong codebase)
- **Phạm vi:** Toàn hệ thống

## Bối cảnh
3 nhóm làm 3 phân hệ (Membership, Operations, Portal) nhưng là một sản phẩm thống nhất, dữ liệu liên kết chặt (CLB ↔ thành viên ↔ task ↔ sự kiện ↔ trang công khai). Đây là đồ án, ưu tiên dễ phát triển/triển khai chung.

## Quyết định
Một **modular monolith**: một solution .NET nhiều module project + một SPA React, dùng **chung một PostgreSQL database**. Tất cả entity tập trung ở `UniClub-Hub.Shared`. Module chỉ reference `Shared`, không reference chéo nhau.

## Lý do
- Đơn giản hơn microservices cho quy mô đồ án (một DB, một lần deploy).
- Tập trung entity ở `Shared` tránh trùng lặp và lệch schema giữa các nhóm.
- Cấm reference chéo giữ ranh giới module (scope isolation) mà không cần tách service.

## Hệ quả
- Tích cực: dễ chia sẻ dữ liệu, một migration history, ranh giới module rõ ràng.
- Đánh đổi: `Shared` là điểm chung dễ tạo xung đột merge → đổi schema phải qua duyệt (xem `.claude/rules/db-safety.md`). Cross-module phải đi qua `Shared`/API contract, không truyền object trực tiếp.
