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

        // Approval workflow fields
        public string Status { get; set; } = "Published";
        public string? UploadedById { get; set; }
        public string? UploadedByName { get; set; }
        public string? ReviewNote { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime UploadedAt { get; set; }
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

    public class RejectGalleryItemRequest
    {
        public string? ReviewNote { get; set; }
    }
}
