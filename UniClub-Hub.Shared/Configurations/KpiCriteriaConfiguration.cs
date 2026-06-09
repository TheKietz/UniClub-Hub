using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class KpiCriteriaConfiguration : IEntityTypeConfiguration<KpiCriteria>
    {
        public void Configure(EntityTypeBuilder<KpiCriteria> builder)
        {
            builder.HasKey(x => x.Id);

            builder
                .Property(x => x.MetricKey)
                .HasConversion<string>()
                .HasMaxLength(40)
                .HasDefaultValue(KpiMetricKey.TaskCompletion);

            builder.Property(x => x.DisplayName).HasMaxLength(120).IsRequired();
            builder.Property(x => x.Description).HasMaxLength(500);
            builder.Property(x => x.Weight).HasDefaultValue(0);
            builder.Property(x => x.IsEnabled).HasDefaultValue(true);

            builder
                .HasIndex(x => new { x.KpiConfigId, x.MetricKey })
                .IsUnique();

            builder
                .HasOne(x => x.KpiConfig)
                .WithMany(x => x.Criteria)
                .HasForeignKey(x => x.KpiConfigId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
