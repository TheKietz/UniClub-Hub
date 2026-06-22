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
            var urls = new List<string>();

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
                    if (url != null) urls.Add(url);
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
                AttachmentUrlsJson = urls.Count > 0 ? JsonSerializer.Serialize(urls) : null,
                CreatedBy = actorId,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            db.EventClubAssignments.Add(assignment);
            await db.SaveChangesAsync();

            var eventName = await db.Events.AsNoTracking()
                .Where(e => e.Id == eventId).Select(e => e.Name).FirstOrDefaultAsync();
            var clubName = await db.Clubs.AsNoTracking()
                .Where(c => c.Id == clubId).Select(c => c.Name).FirstOrDefaultAsync();

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
            List<string> urls = [];
            if (!string.IsNullOrEmpty(a.AttachmentUrlsJson))
            {
                try { urls = JsonSerializer.Deserialize<List<string>>(a.AttachmentUrlsJson) ?? []; }
                catch { /* malformed JSON — skip */ }
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
                AttachmentUrls = urls,
                CreatedBy = a.CreatedBy,
                CreatedAt = a.CreatedAt,
            };
        }
    }
}
