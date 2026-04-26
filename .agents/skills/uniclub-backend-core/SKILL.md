---
name: uniclub-backend-core
description: Chuyên gia kiến trúc Modular Monolith cho dự án UniClub Hub. Sử dụng khi viết code C#, thiết kế API, hoặc xử lý Logic nghiệp vụ Backend.
---

# UniClub Backend Skill

## Nguyên tắc kiến trúc (Modular Monolith)
- **Shared Project**: Chứa toàn bộ Entities và DbContext.
- **Module Projects**: Chứa Services, DTOs và Interfaces.
- **API Project**: Chỉ chứa Controllers và cấu hình Startup.

## Quy tắc Code C#
- **No Repository Pattern**: Sử dụng trực tiếp `UniClubDbContext` trong tầng Service.
- **DTOs**: Luôn sử dụng DTO để nhận và trả dữ liệu qua API.
- **Dependency Injection**: Đăng ký service tại file `DependencyInjection.cs` của từng module thông qua Extension Method.