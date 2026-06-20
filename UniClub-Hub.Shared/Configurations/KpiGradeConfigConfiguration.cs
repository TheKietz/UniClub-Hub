using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class KpiGradeConfigConfiguration : IEntityTypeConfiguration<KpiGradeConfig>
    {
        public void Configure(EntityTypeBuilder<KpiGradeConfig> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Label).HasMaxLength(50).IsRequired();
            builder.Property(x => x.Color).HasMaxLength(20);
            builder.Property(x => x.MinScore).HasDefaultValue(0);
            builder.Property(x => x.DisplayOrder).HasDefaultValue(0);

            builder
                .HasIndex(x => new { x.KpiConfigId, x.MinScore })
                .IsUnique();

            builder
                .HasOne(x => x.KpiConfig)
                .WithMany(x => x.Grades)
                .HasForeignKey(x => x.KpiConfigId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
