using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Configurations
{
    public class MediaGalleryConfiguration : IEntityTypeConfiguration<MediaGallery>
    {
        public void Configure(EntityTypeBuilder<MediaGallery> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.MediaType)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(MediaType.Image);

            builder.Property(x => x.MediaUrl).IsRequired();
        }
    }
}
