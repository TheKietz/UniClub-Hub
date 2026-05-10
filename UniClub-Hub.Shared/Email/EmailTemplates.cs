namespace UniClub_Hub.Shared.Email
{
    public static class EmailTemplates
    {
        public static string PasswordReset(string fullName, string resetLink) => $"""
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
                        <div style="display:inline-flex;align-items:center;gap:10px;">
                          <div style="width:36px;height:36px;background:rgba(255,255,255,.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:18px;">U</div>
                          <span style="color:#fff;font-size:18px;font-weight:600;">UniClub Hub</span>
                        </div>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:36px 40px;">
                        <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">Đặt lại mật khẩu</h2>
                        <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Xin chào <strong>{fullName}</strong>,</p>
                        <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới.
                        </p>
                        <div style="text-align:center;margin:32px 0;">
                          <a href="{resetLink}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;box-shadow:0 4px 12px rgba(79,70,229,.35);">
                            Đặt lại mật khẩu
                          </a>
                        </div>
                        <p style="margin:0 0 8px;color:#64748b;font-size:13px;">Hoặc dùng link sau:</p>
                        <p style="margin:0 0 24px;word-break:break-all;">
                          <a href="{resetLink}" style="color:#4f46e5;font-size:13px;">{resetLink}</a>
                        </p>
                        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
                          <p style="margin:0;color:#92400e;font-size:13px;">
                            ⚠️ Link này chỉ có hiệu lực trong <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                          </p>
                        </div>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                        <p style="margin:0;color:#94a3b8;font-size:12px;">© 2026 UniClub Hub · Hệ thống quản lý câu lạc bộ sinh viên</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
    }
}
