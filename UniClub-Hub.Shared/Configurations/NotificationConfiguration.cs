using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
    {
        public void Configure(EntityTypeBuilder<Notification> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Type)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(NotificationType.System);

            builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
            builder.Property(x => x.CreatedAt).HasColumnType("timestamptz");
        }
    }
}
