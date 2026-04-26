---
description: Hướng dẫn Agent xây dựng API từ tầng Database đến Controller theo chuẩn Modular Monolith.
---

## Các bước thực hiện:

Phân tích yêu cầu trong @project-description.md cho [ModuleName] trước khi thiết kế Entity và DTO

1. **Đề xuất Entity (Shared Project)**:
   - Phân tích yêu cầu và thiết kế các Entity tại `UniClubHub.Shared/Models/`.
   - **Yêu cầu**: Xác định rõ quan hệ (Navigation properties) để chuẩn bị cho việc tối ưu query.
   - **Dừng lại**: Chờ tôi duyệt cấu trúc Entity trước khi ghi file.

2. **Cấu hình Database & EF Core**:
   - Khai báo `DbSet` trong `UniClubDbContext`.
   - Áp dụng các kỹ thuật từ `optimizing-ef-core-queries` (ví dụ: cấu hình Index, Fluent API).

3. **Xây dựng DTOs & Interfaces (Module Project)**:
   - Tạo các Request/Response DTOs để che giấu Entity gốc.
   - Định nghĩa Interface cho Service để đảm bảo tính trừu tượng.

4. **Triển khai Service Logic**:
   - **Hiệu năng**: Luôn sử dụng `.AsNoTracking()` cho các hàm GET và tránh lỗi N+1.
   - **Giám sát**: Tích hợp `ActivitySource` để tracking logic nghiệp vụ theo skill `configuring-opentelemetry-dotnet`.
   - **Bảo mật**: Nếu có upload file, sử dụng `Magic Bytes` và `Guid` cho tên file theo skill `minimal-api-file-upload`.

5. **Tạo Controller & Đăng ký DI**:
   - Tạo Controller tại `UniClubHub.API/Controllers/[ModuleName]/`.
   - Cấu hình `.DisableAntiforgery()` nếu là API endpoint dùng JWT.
   - Đăng ký Service vào file `DependencyInjection.cs` của Module.