using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using UniClub_Hub.Operations.DTOs.Assignment;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class EventAssignmentService(UniClubDbContext db, IFileStorageService fileStorage) : IEventAssignmentService
    {
        private static readonly string[] AllowedExtensions =
            [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".webp"];

        private static readonly long MaxFileSizeBytes = 20 * 1024 * 1024;

        public async Task<List<AssignmentDto>> GetByEventAsync(int eventId)
        {
            var assignments = await db.EventClubAssignments
                .AsNoTracking()
                .Where(a => a.EventId == eventId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            if (assignments.Count == 0) return [];

            var clubIds = assignments.Select(a => a.ClubId).Distinct().ToList();
            var clubNames = await db.Clubs
                .AsNoTracking()
                .Where(c => clubIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name);

            var eventName = await db.Events
                .AsNoTracking()
                .Where(e => e.Id == eventId)
                .Select(e => e.Name)
                .FirstOrDefaultAsync();

            return assignments.Select(a => MapToDto(a, eventName, clubNames.GetValueOrDefault(a.ClubId))).ToList();
        }

        public async Task<List<AssignmentDto>> GetByClubAsync(int clubId)
        {
            var assignments = await db.EventClubAssignments
                .AsNoTracking()
                .Where(a => a.ClubId == clubId && a.Status != "Done")
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            if (assignments.Count == 0) return [];

            var eventIds = assignments.Select(a => a.EventId).Distinct().ToList();
            var eventNames = await db.Events
                .AsNoTracking()
                .Where(e => eventIds.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => e.Name);

            return assignments.Select(a => MapToDto(a, eventNames.GetValueOrDefault(a.EventId), null)).ToList();
        }

        public async Task<AssignmentDto> CreateAsync(
            int eventId, int clubId,
            string title, string? description,
            TaskPriority priority, DateTimeOffset? deadline,
            string actorId, IFormFileCollection? files)
        {
            await ValidateDeadlineWithinEventAsync(eventId, deadline);

            var attachments = new List<AssignmentAttachmentInfo>();

            if (files != null)
            {
                foreach (var file in files)
                {
                    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                    if (!AllowedExtensions.Contains(ext))
                        throw new InvalidOperationException($"Định dạng không được phép: {ext}");
                    if (file.Length > MaxFileSizeBytes)
                        throw new InvalidOperationException($"File '{file.FileName}' vượt quá 20 MB.");

                    var url = await fileStorage.UploadAsync(file, "uploads/assignments");
                    if (url != null) attachments.Add(new AssignmentAttachmentInfo(url, file.FileName));
                }
            }

            var assignment = new EventClubAssignment
            {
                EventId = eventId,
                ClubId = clubId,
                Title = title.Trim(),
                Description = description?.Trim(),
                Priority = priority,
                Deadline = deadline,
                Status = "Pending",
                AttachmentUrlsJson = attachments.Count > 0 ? JsonSerializer.Serialize(attachments) : null,
                CreatedBy = actorId,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            db.EventClubAssignments.Add(assignment);
            await db.SaveChangesAsync();

            var eventName = await db.Events.AsNoTracking()
                .Where(e => e.Id == eventId).Select(e => e.Name).FirstOrDefaultAsync();
            var clubName = await db.Clubs.AsNoTracking()
                .Where(c => c.Id == clubId).Select(c => c.Name).FirstOrDefaultAsync();

            // Note: the receiving club's admins are notified by EventAssignmentsController
            // (NotifyClubAdminsAsync) so all admins get one AssignmentReceived notification.

            return MapToDto(assignment, eventName, clubName);
        }

        // A deadline must fall within the parent event's [StartTime, EndTime] window.
        private async Task ValidateDeadlineWithinEventAsync(int eventId, DateTimeOffset? deadline)
        {
            if (!deadline.HasValue) return;

            if (deadline.Value < DateTimeOffset.UtcNow)
            {
                throw new InvalidOperationException("Deadline không được trước thời điểm hiện tại.");
            }

            var ev = await db.Events.AsNoTracking()
                .Where(e => e.Id == eventId)
                .Select(e => new { e.EndTime })
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Event {eventId} not found.");

            if (ev.EndTime.HasValue && deadline > ev.EndTime)
                throw new InvalidOperationException("Deadline không thể sau ngày kết thúc sự kiện.");
        }

        public async Task<AssignmentDto> UpdateAsync(int id, string title, string? description, TaskPriority priority, DateTimeOffset? deadline, int clubId)
        {
            var assignment = await db.EventClubAssignments.FindAsync(id)
                ?? throw new KeyNotFoundException($"Assignment {id} not found.");

            await ValidateDeadlineWithinEventAsync(assignment.EventId, deadline);

            assignment.Title = title.Trim();
            assignment.Description = description?.Trim();
            assignment.Priority = priority;
            assignment.Deadline = deadline;
            if (clubId > 0) assignment.ClubId = clubId;

            await db.SaveChangesAsync();

            var eventName = await db.Events.AsNoTracking()
                .Where(e => e.Id == assignment.EventId).Select(e => e.Name).FirstOrDefaultAsync();
            var clubName = await db.Clubs.AsNoTracking()
                .Where(c => c.Id == assignment.ClubId).Select(c => c.Name).FirstOrDefaultAsync();

            return MapToDto(assignment, eventName, clubName);
        }

        public async Task<AssignmentDto> AddAttachmentsAsync(int id, IFormFileCollection files)
        {
            var assignment = await db.EventClubAssignments.FindAsync(id)
                ?? throw new KeyNotFoundException($"Assignment {id} not found.");

            var existing = DeserializeAttachments(assignment.AttachmentUrlsJson);

            foreach (var file in files)
            {
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedExtensions.Contains(ext))
                    throw new InvalidOperationException($"Định dạng không được phép: {ext}");
                if (file.Length > MaxFileSizeBytes)
                    throw new InvalidOperationException($"File '{file.FileName}' vượt quá 20 MB.");

                var url = await fileStorage.UploadAsync(file, "uploads/assignments");
                if (url != null) existing.Add(new AssignmentAttachmentInfo(url, file.FileName));
            }

            assignment.AttachmentUrlsJson = existing.Count > 0 ? JsonSerializer.Serialize(existing) : null;
            await db.SaveChangesAsync();

            return await ReloadDtoAsync(assignment);
        }

        public async Task<AssignmentDto> RemoveAttachmentAsync(int id, string url)
        {
            var assignment = await db.EventClubAssignments.FindAsync(id)
                ?? throw new KeyNotFoundException($"Assignment {id} not found.");

            var existing = DeserializeAttachments(assignment.AttachmentUrlsJson);
            existing.RemoveAll(a => a.Url == url);

            assignment.AttachmentUrlsJson = existing.Count > 0 ? JsonSerializer.Serialize(existing) : null;
            await db.SaveChangesAsync();

            return await ReloadDtoAsync(assignment);
        }

        private static List<AssignmentAttachmentInfo> DeserializeAttachments(string? json)
        {
            if (string.IsNullOrEmpty(json)) return [];
            try { return JsonSerializer.Deserialize<List<AssignmentAttachmentInfo>>(json) ?? []; }
            catch { return []; }
        }

        private async Task<AssignmentDto> ReloadDtoAsync(UniClub_Hub.Shared.Models.EventClubAssignment assignment)
        {
            var eventName = await db.Events.AsNoTracking()
                .Where(e => e.Id == assignment.EventId).Select(e => e.Name).FirstOrDefaultAsync();
            var clubName = await db.Clubs.AsNoTracking()
                .Where(c => c.Id == assignment.ClubId).Select(c => c.Name).FirstOrDefaultAsync();
            return MapToDto(assignment, eventName, clubName);
        }

        public async Task<AssignmentDto> UpdateStatusAsync(int id, string status)
        {
            var assignment = await db.EventClubAssignments.FindAsync(id)
                ?? throw new KeyNotFoundException($"Assignment {id} not found.");

            assignment.Status = status;
            await db.SaveChangesAsync();
            return MapToDto(assignment, null, null);
        }

        public async Task DeleteAsync(int id)
        {
            var assignment = await db.EventClubAssignments.FindAsync(id)
                ?? throw new KeyNotFoundException($"Assignment {id} not found.");

            db.EventClubAssignments.Remove(assignment);
            await db.SaveChangesAsync();
        }

        private static AssignmentDto MapToDto(EventClubAssignment a, string? eventName, string? clubName)
        {
            List<AssignmentAttachmentInfo> attachments = [];
            if (!string.IsNullOrEmpty(a.AttachmentUrlsJson))
            {
                try
                {
                    // New format: [{"url":"...","name":"..."}]
                    attachments = JsonSerializer.Deserialize<List<AssignmentAttachmentInfo>>(a.AttachmentUrlsJson) ?? [];
                }
                catch
                {
                    // Old format (backward compat): ["url1","url2"]
                    try
                    {
                        var oldUrls = JsonSerializer.Deserialize<List<string>>(a.AttachmentUrlsJson) ?? [];
                        attachments = oldUrls
                            .Select(u => new AssignmentAttachmentInfo(u, Uri.UnescapeDataString(u.Split('/').LastOrDefault() ?? u)))
                            .ToList();
                    }
                    catch { /* malformed JSON — skip */ }
                }
            }

            return new AssignmentDto
            {
                Id = a.Id,
                EventId = a.EventId,
                EventName = eventName,
                ClubId = a.ClubId,
                ClubName = clubName,
                Title = a.Title,
                Description = a.Description,
                Priority = a.Priority,
                Deadline = a.Deadline,
                Status = a.Status,
                AttachmentUrls = attachments,
                CreatedBy = a.CreatedBy,
                CreatedAt = a.CreatedAt,
            };
        }
    }
}
