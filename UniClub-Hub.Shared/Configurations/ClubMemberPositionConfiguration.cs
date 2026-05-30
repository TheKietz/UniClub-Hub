using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class ClubMemberPositionConfiguration : IEntityTypeConfiguration<ClubMemberPosition>
    {
        public void Configure(EntityTypeBuilder<ClubMemberPosition> builder)
        {
            builder.HasKey(x => new { x.MembershipId, x.PositionId });

            builder.HasOne(x => x.Membership)
                .WithMany(m => m.Positions)
                .HasForeignKey(x => x.MembershipId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Position)
                .WithMany(p => p.MemberPositions)
                .HasForeignKey(x => x.PositionId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
