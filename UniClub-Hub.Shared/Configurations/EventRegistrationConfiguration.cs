using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class EventRegistrationConfiguration : IEntityTypeConfiguration<EventRegistration>
    {
        public void Configure(EntityTypeBuilder<EventRegistration> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Attendance)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(AttendanceStatus.Pending);

            builder.Property(x => x.RegisteredAt).HasColumnType("timestamptz");
            builder.Property(x => x.CheckedInAt).HasColumnType("timestamptz");
        }
    }
}
