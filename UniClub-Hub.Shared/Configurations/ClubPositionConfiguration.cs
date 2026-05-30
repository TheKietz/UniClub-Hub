using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class ClubPositionConfiguration : IEntityTypeConfiguration<ClubPosition>
    {
        public void Configure(EntityTypeBuilder<ClubPosition> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(120)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(500);

            builder.HasIndex(x => new { x.ClubId, x.DepartmentId, x.Name })
                .IsUnique()
                .HasFilter("\"IsDeleted\" = false");

            builder.HasOne(x => x.Club)
                .WithMany(c => c.Positions)
                .HasForeignKey(x => x.ClubId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Department)
                .WithMany(d => d.Positions)
                .HasForeignKey(x => x.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
