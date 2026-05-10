using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class ClubApplicationConfiguration : IEntityTypeConfiguration<ClubApplication>
    {
        public void Configure(EntityTypeBuilder<ClubApplication> builder)
        {
            builder.ToTable("Applications");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(ApplicationStatus.Pending);

            builder.Property(x => x.AppliedAt).HasColumnType("timestamptz");
        }
    }
}
