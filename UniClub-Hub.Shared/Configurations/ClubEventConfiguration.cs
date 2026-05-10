using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class ClubEventConfiguration : IEntityTypeConfiguration<ClubEvent>
    {
        public void Configure(EntityTypeBuilder<ClubEvent> builder)
        {
            builder.ToTable("Events");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(EventStatus.Draft);

            builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
            builder.Property(x => x.StartTime).HasColumnType("timestamptz");
            builder.Property(x => x.EndTime).HasColumnType("timestamptz");
            builder.Property(x => x.CreatedAt).HasColumnType("timestamptz").IsRequired();
            builder.Property(x => x.UpdatedAt).HasColumnType("timestamptz");
        }
    }
}
