namespace UniClub_Hub.Shared.Common
{
    public interface ISoftDeletable
    {
        bool IsDeleted { get; set; }
        string? DeletedBy { get; set; }
    }
}
