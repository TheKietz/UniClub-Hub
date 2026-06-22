namespace UniClub_Hub.Membership.DTOs.Gallery
{
    public class GalleryItemResponse
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public string MediaUrl { get; set; } = "";
        public string MediaType { get; set; } = "Image";
        public string? Description { get; set; }
        public int? EventId { get; set; }
    }

    public class AddVideoRequest
    {
        public string Url { get; set; } = "";
        public string? Description { get; set; }
    }

    public class UpdateGalleryItemRequest
    {
        public string? Description { get; set; }
    }
}
