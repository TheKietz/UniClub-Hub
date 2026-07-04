using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Stats;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class StatsService : IStatsService
    {
        private readonly UniClubDbContext _db;

        public StatsService(UniClubDbContext db)
        {
            _db = db;
        }

        public async Task<SystemStatsDto> GetSystemStatsAsync()
        {
            var totalUsers = await _db.Users.CountAsync();
            var totalClubs = await _db.Clubs.CountAsync();
            var activeClubs = await _db.Clubs.CountAsync(c => c.Status == ClubStatus.Active);
            var totalActiveMembers = await _db.ClubMemberships.CountAsync(m => m.Status == MembershipStatus.Active);
            var totalProbationMembers = await _db.ClubMemberships.CountAsync(m => m.Status == MembershipStatus.Probation);

            var appCounts = await _db.Applications
                .GroupBy(a => a.Status)
                .Select(g => new StatusCount { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            var clubsByCategory = await _db.Clubs
                .Where(c => c.CategoryId.HasValue)
                .GroupBy(c => new { c.CategoryId, CategoryName = c.Category!.Name })
                .Select(g => new CategoryStatDto
                {
                    CategoryId = g.Key.CategoryId!.Value,
                    CategoryName = g.Key.CategoryName,
                    ClubCount = g.Count()
                })
                .OrderByDescending(c => c.ClubCount)
                .ToListAsync();

            var topClubs = await _db.ClubMemberships
                .Where(m => m.Status == MembershipStatus.Active)
                .GroupBy(m => new { m.ClubId, ClubName = m.Club.Name })
                .Select(g => new TopClubDto
                {
                    ClubId = g.Key.ClubId,
                    ClubName = g.Key.ClubName,
                    MemberCount = g.Count()
                })
                .OrderByDescending(c => c.MemberCount)
                .Take(5)
                .ToListAsync();

            return new SystemStatsDto
            {
                TotalUsers = totalUsers,
                TotalClubs = totalClubs,
                ActiveClubs = activeClubs,
                TotalActiveMembers = totalActiveMembers,
                TotalProbationMembers = totalProbationMembers,
                Applications = BuildStatusCount(appCounts),
                ClubsByCategory = clubsByCategory,
                TopClubsByMembers = topClubs
            };
        }

        public async Task<ClubStatsDto?> GetClubStatsAsync(int clubId)
        {
            var club = await _db.Clubs.FindAsync(clubId);
            if (club == null) return null;

            var totalProbation = await _db.ClubMemberships
                .CountAsync(m => m.ClubId == clubId && m.Status == MembershipStatus.Probation);

            var membersByRole = await _db.ClubMemberships
                .Where(m => m.ClubId == clubId && m.Status == MembershipStatus.Active)
                .GroupBy(m => m.ClubRole)
                .Select(g => new { Role = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.Role, g => g.Count);

            var membersByDept = await _db.ClubMemberships
                .Where(m => m.ClubId == clubId && m.Status == MembershipStatus.Active)
                .GroupBy(m => new
                {
                    m.DepartmentId,
                    DeptName = m.Department == null ? "Chưa có ban" : m.Department.Name
                })
                .Select(g => new DepartmentStatDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DeptName,
                    MemberCount = g.Count()
                })
                .ToListAsync();

            var appCounts = await _db.Applications
                .Where(a => a.ClubId == clubId)
                .GroupBy(a => a.Status)
                .Select(g => new StatusCount { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            var totalDepartments = await _db.Departments.CountAsync(d => d.ClubId == clubId);

            return new ClubStatsDto
            {
                ClubId = clubId,
                ClubName = club.Name,
                TotalActiveMembers = membersByRole.Values.Sum(),
                TotalProbationMembers = totalProbation,
                TotalDepartments = totalDepartments,
                MembersByRole = membersByRole,
                MembersByDepartment = membersByDept,
                Applications = BuildStatusCount(appCounts)
            };
        }

        public async Task<List<MonthlyGrowthDto>> GetMemberGrowthAsync(int? clubId, int months = 12)
        {
            var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-months + 1));
            cutoff = new DateOnly(cutoff.Year, cutoff.Month, 1);

            var raw = await _db.ClubMemberships
                .Where(m => m.JoinedDate >= cutoff && (clubId == null || m.ClubId == clubId))
                .GroupBy(m => new { m.JoinedDate.Year, m.JoinedDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                .ToListAsync();

            var result = new List<MonthlyGrowthDto>();
            var now = DateTime.UtcNow;
            for (int i = months - 1; i >= 0; i--)
            {
                var d = now.AddMonths(-i);
                var count = raw.FirstOrDefault(r => r.Year == d.Year && r.Month == d.Month)?.Count ?? 0;
                result.Add(new MonthlyGrowthDto
                {
                    Year = d.Year,
                    Month = d.Month,
                    Label = $"Th{d.Month}/{d.Year % 100:D2}",
                    NewMembers = count,
                });
            }
            return result;
        }

        private sealed class StatusCount
        {
            public ApplicationStatus Status { get; set; }
            public int Count { get; set; }
        }

        private static ApplicationStatusCountDto BuildStatusCount(List<StatusCount> counts)
        {
            int Get(ApplicationStatus s) => counts.FirstOrDefault(x => x.Status == s)?.Count ?? 0;
            return new ApplicationStatusCountDto
            {
                Pending = Get(ApplicationStatus.Pending),
                Interview = Get(ApplicationStatus.Interview),
                Reviewing = Get(ApplicationStatus.Reviewing),
                Accepted = Get(ApplicationStatus.Accepted),
                Rejected = Get(ApplicationStatus.Rejected)
            };
        }
    }
}
