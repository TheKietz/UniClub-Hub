namespace UniClub_Hub.Shared.Email
{
    public static class EmailTemplates
    {
        // ── Shared layout helpers ──────────────────────────────────────────────
        private static string Header(string? logoUrl = null)
        {
            var logoHtml = string.IsNullOrWhiteSpace(logoUrl)
                ? "<table cellpadding=\"0\" cellspacing=\"0\"><tr>" +
                  "<td style=\"width:36px;height:36px;background:#facc15;border-radius:8px;border:1.5px solid #facc15;text-align:center;vertical-align:middle;font-size:15px;font-weight:900;color:#15131a;letter-spacing:-.02em;\">U!</td>" +
                  "<td style=\"padding-left:10px;font-size:17px;font-weight:800;color:#ffffff;letter-spacing:-.02em;\">UniClub Hub</td>" +
                  "</tr></table>"
                : $"<img src=\"{logoUrl}\" alt=\"UniClub Hub\" style=\"height:40px;width:auto;display:block;\" />";

            return $"""
                <!DOCTYPE html>
                <html lang="vi">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
                <title>UniClub Hub</title></head>
                <body style="margin:0;padding:0;background:#f7f6f1;font-family:'Segoe UI',system-ui,sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f1;padding:40px 16px;">
                  <tr><td align="center">
                    <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1.5px solid #15131a;border-radius:16px;overflow:hidden;">
                      <!-- Logo header -->
                      <tr>
                        <td style="background:#15131a;padding:24px 32px;">
                          {logoHtml}
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr><td style="padding:36px 40px 32px;">
                """;
        }

        private static string Footer() => """
                  </td></tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f7f6f1;padding:18px 32px;border-top:1px solid #e8e3d6;text-align:center;">
                      <p style="margin:0;font-size:11.5px;color:#918c99;">© 2026 UniClub Hub &nbsp;·&nbsp; Hệ thống quản lý câu lạc bộ sinh viên UEF</p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
            </body></html>
            """;

        private static string PrimaryBtn(string href, string text) =>
            $"""<div style="text-align:center;margin:32px 0;"><a href="{href}" style="display:inline-block;background:#15131a;color:#facc15;text-decoration:none;padding:14px 36px;border-radius:999px;font-size:15px;font-weight:800;border:1.5px solid #15131a;letter-spacing:-.01em;">{text}</a></div>""";

        private static string Warning(string html) =>
            $"""<div style="background:#fef9c3;border:1.5px solid #15131a;border-radius:10px;padding:13px 16px;margin-top:20px;"><p style="margin:0;color:#713f12;font-size:13px;line-height:1.6;">{html}</p></div>""";

        private static string Note(string html) =>
            $"""<div style="background:#f7f6f1;border-left:3px solid #4f46e5;padding:13px 16px;border-radius:0 8px 8px 0;margin:20px 0;"><p style="margin:0;color:#15131a;font-size:14px;line-height:1.5;">{html}</p></div>""";

        // ── Templates ──────────────────────────────────────────────────────────

        public static string EmailVerification(string fullName, string confirmLink, string? logoUrl = null) =>
            Header(logoUrl) + $"""
            <h2 style="margin:0 0 6px;color:#15131a;font-size:22px;font-weight:900;letter-spacing:-.03em;">Xác thực tài khoản</h2>
            <p style="margin:0 0 20px;color:#4a4651;font-size:14px;">Xin chào <strong style="color:#15131a;">{fullName}</strong>,</p>
            <p style="margin:0;color:#4a4651;font-size:14.5px;line-height:1.65;">
              Cảm ơn bạn đã đăng ký tài khoản <strong>UniClub Hub</strong>. Nhấn vào nút bên dưới để xác thực địa chỉ email và bắt đầu khám phá các câu lạc bộ.
            </p>
            """ + PrimaryBtn(confirmLink, "✓ Xác thực email") + $"""
            <p style="margin:16px 0 6px;color:#918c99;font-size:12px;">Hoặc copy link sau vào trình duyệt:</p>
            <p style="margin:0;word-break:break-all;"><a href="{confirmLink}" style="color:#4f46e5;font-size:12px;text-decoration:underline;">{confirmLink}</a></p>
            """ + Warning("⚠️ Link có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.")
            + Footer();

        public static string PasswordReset(string fullName, string resetLink, string? logoUrl = null) =>
            Header(logoUrl) + $"""
            <h2 style="margin:0 0 6px;color:#15131a;font-size:22px;font-weight:900;letter-spacing:-.03em;">Đặt lại mật khẩu</h2>
            <p style="margin:0 0 20px;color:#4a4651;font-size:14px;">Xin chào <strong style="color:#15131a;">{fullName}</strong>,</p>
            <p style="margin:0;color:#4a4651;font-size:14.5px;line-height:1.65;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới.
            </p>
            """ + PrimaryBtn(resetLink, "Đặt lại mật khẩu →") + $"""
            <p style="margin:16px 0 6px;color:#918c99;font-size:12px;">Hoặc copy link sau vào trình duyệt:</p>
            <p style="margin:0;word-break:break-all;"><a href="{resetLink}" style="color:#4f46e5;font-size:12px;text-decoration:underline;">{resetLink}</a></p>
            """ + Warning("⚠️ Link chỉ có hiệu lực trong <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.")
            + Footer();

        public static string ApplicationResult(string fullName, string clubName, string status, string? note, string loginLink, string? logoUrl = null)
        {
            var (title, body, accent) = status switch
            {
                "Interview" => (
                    "Mời phỏng vấn",
                    $"Đơn đăng ký tham gia <strong>{clubName}</strong> của bạn đã được xem xét và ban quản lý muốn mời bạn đến <strong>phỏng vấn</strong>. Đăng nhập để xem chi tiết lịch hẹn.",
                    "#4f46e5"),
                "Accepted" => (
                    "🎉 Đơn được chấp nhận!",
                    $"Chúc mừng! Đơn đăng ký tham gia <strong>{clubName}</strong> của bạn đã được <strong>chấp nhận</strong>. Chào mừng bạn đến với CLB!",
                    "#10b981"),
                _ => (
                    "Thông báo kết quả đơn",
                    $"Đơn đăng ký tham gia <strong>{clubName}</strong> của bạn chưa được chấp nhận lần này. Cảm ơn bạn đã quan tâm đến CLB.",
                    "#ef4444")
            };

            var noteBlock = string.IsNullOrEmpty(note) ? "" : Note($"<strong>Ghi chú từ ban quản lý:</strong> {note}");

            return Header(logoUrl) + $"""
            <div style="display:inline-block;background:{accent};color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em;padding:3px 10px;border-radius:4px;text-transform:uppercase;margin-bottom:12px;">{clubName}</div>
            <h2 style="margin:0 0 6px;color:#15131a;font-size:22px;font-weight:900;letter-spacing:-.03em;">{title}</h2>
            <p style="margin:0 0 20px;color:#4a4651;font-size:14px;">Xin chào <strong style="color:#15131a;">{fullName}</strong>,</p>
            <p style="margin:0;color:#4a4651;font-size:14.5px;line-height:1.65;">{body}</p>
            {noteBlock}
            """ + PrimaryBtn(loginLink, "Xem chi tiết →")
            + Footer();
        }
    }
}
