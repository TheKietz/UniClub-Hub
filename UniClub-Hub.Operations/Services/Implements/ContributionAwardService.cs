using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Operations.Services.Implements
{
    public class ContributionAwardService(UniClubDbContext db) : IContributionAwardService
    {
        public async Task AwardTaskCompletionAsync(
            ClubTask task,
            CancellationToken cancellationToken = default)
        {
            var userIds = await ResolveActiveTaskAssigneesAsync(task, cancellationToken);
            if (userIds.Count == 0)
                return;

            var alreadyAwarded = await db.Contributions
                .Where(c =>
                    c.TaskId == task.Id &&
                    c.ActivityType == ActivityType.Task &&
                    userIds.Contains(c.UserId))
                .Select(c => c.UserId)
                .ToListAsync(cancellationToken);

            var existing = alreadyAwarded.ToHashSet();
            var points = ContributionPoints.ForTaskPriority(task.Priority);
            var recordedAt = DateTimeOffset.UtcNow;
            var note = $"Auto: hoàn thành task '{task.Title}' ({task.Priority})";

            foreach (var userId in userIds.Where(userId => !existing.Contains(userId)))
            {
                db.Contributions.Add(new Contribution
                {
                    UserId = userId,
                    ClubId = task.ClubId,
                    TaskId = task.Id,
                    ActivityType = ActivityType.Task,
                    Points = points,
                    Note = note,
                    RecordedAt = recordedAt,
                });
            }
        }

        public async Task ReverseTaskAsync(int taskId, CancellationToken cancellationToken = default)
        {
            var contributions = await db.Contributions
                .Where(c => c.TaskId == taskId && c.ActivityType == ActivityType.Task)
                .ToListAsync(cancellationToken);

            if (contributions.Count > 0)
                db.Contributions.RemoveRange(contributions);
        }

        public async Task AwardEventCheckInAsync(
            int eventId,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var ev = await db.Events
                .AsNoTracking()
                .Where(e => e.Id == eventId)
                .Select(e => new { e.Id, e.ClubId, e.Name })
                .FirstOrDefaultAsync(cancellationToken);

            if (ev?.ClubId is not int clubId)
                return;

            var isActiveMember = await db.ClubMemberships
                .AsNoTracking()
                .AnyAsync(m =>
                    m.ClubId == clubId &&
                    m.UserId == userId &&
                    m.Status == MembershipStatus.Active,
                    cancellationToken);

            if (!isActiveMember)
                return;

            var exists = await db.Contributions
                .AnyAsync(c =>
                    c.EventId == eventId &&
                    c.UserId == userId &&
                    c.ActivityType == ActivityType.Event,
                    cancellationToken);

            if (exists)
                return;

            db.Contributions.Add(new Contribution
            {
                UserId = userId,
                ClubId = clubId,
                EventId = eventId,
                ActivityType = ActivityType.Event,
                Points = ContributionPoints.EventCheckIn,
                Note = $"Auto: điểm danh sự kiện '{ev.Name}'",
                RecordedAt = DateTimeOffset.UtcNow,
            });
        }

        public async Task ReverseEventCheckInAsync(
            int eventId,
            string userId,
            CancellationToken cancellationToken = default)
        {
            var contributions = await db.Contributions
                .Where(c =>
                    c.EventId == eventId &&
                    c.UserId == userId &&
                    c.ActivityType == ActivityType.Event)
                .ToListAsync(cancellationToken);

            if (contributions.Count > 0)
                db.Contributions.RemoveRange(contributions);
        }

        private async Task<List<string>> ResolveActiveTaskAssigneesAsync(
            ClubTask task,
            CancellationToken cancellationToken)
        {
            var candidateIds = new HashSet<string>();

            if (!string.IsNullOrWhiteSpace(task.AssignedTo))
                candidateIds.Add(task.AssignedTo);

            foreach (var userId in task.Assignees.Select(a => a.UserId))
            {
                if (!string.IsNullOrWhiteSpace(userId))
                    candidateIds.Add(userId);
            }

            if (candidateIds.Count == 0)
                return [];

            return await db.ClubMemberships
                .AsNoTracking()
                .Where(m =>
                    m.ClubId == task.ClubId &&
                    candidateIds.Contains(m.UserId) &&
                    m.Status == MembershipStatus.Active)
                .Select(m => m.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);
        }
    }
}
