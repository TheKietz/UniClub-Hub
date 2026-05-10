using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class SprintConfiguration : IEntityTypeConfiguration<Sprint>
    {
        public void Configure(EntityTypeBuilder<Sprint> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(SprintStatus.Planning);

            builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
            builder.Property(x => x.StartDate).HasColumnType("timestamptz").IsRequired();
            builder.Property(x => x.EndDate).HasColumnType("timestamptz").IsRequired();
            builder.Property(x => x.CreatedAt).HasColumnType("timestamptz").IsRequired();
            builder.Property(x => x.UpdatedAt).HasColumnType("timestamptz");
        }
    }
}
