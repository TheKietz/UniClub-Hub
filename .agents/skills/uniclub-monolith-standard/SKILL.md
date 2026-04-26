---
name: uniclub-monolith-standard
description: Chuyên gia xây dựng Modular Monolith. Sử dụng để phát triển tính năng cho BẤT KỲ module nào (Membership, Operations, Portal) trong UniClub Hub.
---

# UniClub Hub Development Standards

## 1. Cấu trúc tệp tin (File Locations)
- **Entities**: Luôn nằm tại `UniClubHub.Shared/Models/`.
- **Services/DTOs**: Nằm tại `UniClubHub.[ModuleName]/` tương ứng.
- **Controllers**: Nằm tại `UniClubHub.API/Controllers/[ModuleName]/`.

## 2. Tiêu chuẩn Backend
- Tuyệt đối không dùng Repository Pattern; sử dụng `UniClubDbContext` trực tiếp.
- Đăng ký service qua `DependencyInjection.cs` tại thư mục gốc của từng Module.

## 3. Tiêu chuẩn Frontend (Kết hợp Vercel Skills)
- Áp dụng `async-parallel` (SKILL1) để Fetch dữ liệu từ API.
- Áp dụng `architecture-avoid-boolean-props` (SKILL) khi tạo UI component.