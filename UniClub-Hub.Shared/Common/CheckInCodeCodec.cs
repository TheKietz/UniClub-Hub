using System.Text;

namespace UniClub_Hub.Shared.Common
{
    /// <summary>
    /// Định dạng mã QR check-in sự kiện, dùng chung giữa các module.
    /// Payload = Base64("{eventId}_{userId}") — khớp với decodeQrPayload ở client
    /// (atob rồi tách theo dấu '_' đầu tiên; userId là GUID nên không chứa '_').
    /// </summary>
    public static class CheckInCodeCodec
    {
        public static string Encode(int eventId, string userId)
            => Convert.ToBase64String(Encoding.UTF8.GetBytes($"{eventId}_{userId}"));
    }
}
