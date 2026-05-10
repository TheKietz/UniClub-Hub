using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class ClubConfiguration : IEntityTypeConfiguration<Club>
    {
        public void Configure(EntityTypeBuilder<Club> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(ClubStatus.Active);

            builder.Property(x => x.Name).HasMaxLength(150).IsRequired();
            builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
            builder.Property(x => x.AdvisorName).HasMaxLength(150);
            builder.Property(x => x.CreatedAt).HasColumnType("timestamptz").IsRequired();
            builder.Property(x => x.UpdatedAt).HasColumnType("timestamptz");
        }
    }
}
