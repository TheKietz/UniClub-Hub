using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class KpiConfigConfiguration : IEntityTypeConfiguration<KpiConfig>
    {
        public void Configure(EntityTypeBuilder<KpiConfig> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UpdatedAt).HasColumnType("timestamptz");

            builder.HasIndex(x => x.ClubId).IsUnique();

            builder
                .HasOne(x => x.Club)
                .WithMany()
                .HasForeignKey(x => x.ClubId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
