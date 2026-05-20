using Microsoft.Extensions.Configuration;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace UniClub_Hub.Shared.Email
{
    public class SendGridEmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public SendGridEmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendAsync(string to, string subject, string htmlBody)
        {
            var apiKey = _config["SendGrid:ApiKey"]
                ?? throw new InvalidOperationException("SendGrid:ApiKey is not configured.");
            var fromEmail = _config["SendGrid:FromAddress"] ?? "noreply@uniclubhub.com";
            var fromName = _config["SendGrid:FromName"] ?? "UniClub Hub";

            var client = new SendGridClient(apiKey);
            var from = new EmailAddress(fromEmail, fromName);
            var toAddress = new EmailAddress(to);
            var msg = MailHelper.CreateSingleEmail(from, toAddress, subject, plainTextContent: null, htmlBody);

            var response = await client.SendEmailAsync(msg);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Body.ReadAsStringAsync();
                throw new InvalidOperationException($"SendGrid gửi email thất bại ({response.StatusCode}): {body}");
            }
        }
    }
}
