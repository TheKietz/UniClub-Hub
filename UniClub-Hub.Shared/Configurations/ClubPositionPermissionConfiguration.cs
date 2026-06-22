using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class ClubPositionPermissionConfiguration : IEntityTypeConfiguration<ClubPositionPermission>
    {
        public void Configure(EntityTypeBuilder<ClubPositionPermission> builder)
        {
            builder.HasKey(x => new { x.PositionId, x.PermissionCode });

            builder.Property(x => x.PermissionCode)
                .HasMaxLength(120)
                .IsRequired();

            builder.HasOne(x => x.Position)
                .WithMany(p => p.Permissions)
                .HasForeignKey(x => x.PositionId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
