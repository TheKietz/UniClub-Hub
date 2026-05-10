using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class ClubTaskConfiguration : IEntityTypeConfiguration<ClubTask>
    {
        public virtual void Configure(EntityTypeBuilder<ClubTask> builder)
        {
            builder.ToTable("Tasks"); // Khai báo tên bảng
            builder.HasKey(x => x.Id);

            // Cấu hình kiểu dữ liệu timestamptz cho PostgreSQL
            builder.Property(x => x.CreatedAt).HasColumnType("timestamptz").IsRequired();

            builder.Property(x => x.UpdatedAt).HasColumnType("timestamptz");

            builder.Property(x => x.Deadline).HasColumnType("timestamptz");

            builder
                .Property(x => x.Status)
                .HasConversion<string>() // Bắt buộc để lưu "Todo", "Doing" thay vì 0, 1
                .HasMaxLength(20)
                .HasDefaultValue(ClubTaskStatus.Todo);

            builder
                .Property(x => x.Priority)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(TaskPriority.Medium);
        }
    }
}
