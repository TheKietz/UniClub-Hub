using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class ClubMembershipConfiguration : IEntityTypeConfiguration<ClubMembership>
    {
        public void Configure(EntityTypeBuilder<ClubMembership> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.ClubRole)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(ClubRole.MEMBER);

            builder.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(MembershipStatus.Active);
        }
    }
}
