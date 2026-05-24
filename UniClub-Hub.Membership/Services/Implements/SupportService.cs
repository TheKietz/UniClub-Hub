using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Support;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class SupportService : ISupportService
    {
        private readonly UniClubDbContext _db;
        private readonly INotificationService _notifications;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ISystemSettingService _settings;

        public SupportService(UniClubDbContext db, INotificationService notifications, UserManager<ApplicationUser> userManager, ISystemSettingService settings)
        {
            _db = db;
            _notifications = notifications;
            _userManager = userManager;
            _settings = settings;
        }

        public async Task<SupportTicketDto> CreateAsync(string userId, CreateSupportTicketDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Subject))
                throw new ArgumentException("Vui lòng nhập tiêu đề.");
            if (string.IsNullOrWhiteSpace(dto.Message))
                throw new ArgumentException("Vui lòng nhập nội dung.");

            var ticket = new SupportTicket
            {
                UserId = userId,
                Subject = dto.Subject.Trim(),
                Message = dto.Message.Trim(),
                Status = "Open",
                CreatedAt = DateTime.UtcNow,
            };

            _db.SupportTickets.Add(ticket);
            await _db.SaveChangesAsync();

            // Gửi thông báo cho tất cả SUPER_ADMIN
            var admins = await _userManager.GetUsersInRoleAsync(SystemRole.SuperAdmin);
            var sender = await _db.Users.FindAsync(userId);
            var senderName = sender?.FullName ?? sender?.Email ?? "Người dùng";

            var supportNewMsg = await _settings.GetNotificationTextAsync("notification.msg.support_new", new() { ["senderName"] = senderName, ["subject"] = dto.Subject });
            if (!string.IsNullOrEmpty(supportNewMsg))
                foreach (var admin in admins)
                    await _notifications.SendAsync(admin.Id, "Yêu cầu hỗ trợ mới", supportNewMsg, NotificationType.System);

            return await GetDtoAsync(ticket.Id);
        }

        public async Task<IEnumerable<SupportTicketDto>> GetMyTicketsAsync(string userId)
        {
            return await _db.SupportTickets
                .AsNoTracking()
                .Include(t => t.User)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => ToDto(t))
                .ToListAsync();
        }

        public async Task<IEnumerable<SupportTicketDto>> GetAllAsync(string? status = null)
        {
            var query = _db.SupportTickets
                .AsNoTracking()
                .Include(t => t.User)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(t => t.Status == status);

            return await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => ToDto(t))
                .ToListAsync();
        }

        public async Task<SupportTicketDto> UpdateStatusAsync(int ticketId, UpdateTicketStatusDto dto)
        {
            var ticket = await _db.SupportTickets.FindAsync(ticketId)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu hỗ trợ.");

            var validStatuses = new[] { "Open", "InProgress", "Resolved" };
            if (!validStatuses.Contains(dto.Status))
                throw new ArgumentException("Trạng thái không hợp lệ.");

            ticket.Status = dto.Status;
            ticket.AdminNote = dto.AdminNote?.Trim();
            if (dto.Status == "Resolved")
                ticket.ResolvedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            // Thông báo cho người gửi khi ticket được xử lý/đóng
            if (dto.Status == "InProgress" || dto.Status == "Resolved")
            {
                var msgKey = dto.Status == "Resolved" ? "notification.msg.support_resolved" : "notification.msg.support_inprogress";
                var msg = await _settings.GetNotificationTextAsync(msgKey, new() { ["subject"] = ticket.Subject });
                if (!string.IsNullOrEmpty(msg))
                    await _notifications.SendAsync(ticket.UserId, "Cập nhật yêu cầu hỗ trợ", msg, NotificationType.System);
            }

            return await GetDtoAsync(ticketId);
        }

        private async Task<SupportTicketDto> GetDtoAsync(int ticketId)
        {
            return await _db.SupportTickets
                .AsNoTracking()
                .Include(t => t.User)
                .Where(t => t.Id == ticketId)
                .Select(t => ToDto(t))
                .FirstAsync();
        }

        private static SupportTicketDto ToDto(SupportTicket t) => new()
        {
            Id = t.Id,
            Subject = t.Subject,
            Message = t.Message,
            Status = t.Status,
            AdminNote = t.AdminNote,
            CreatedAt = t.CreatedAt,
            ResolvedAt = t.ResolvedAt,
            UserId = t.UserId,
            UserFullName = t.User?.FullName ?? t.User?.Email ?? "",
            UserEmail = t.User?.Email ?? "",
        };
    }
}
