using Moq;
using UniClub_Hub.Membership.DTOs.Kpi;
using Xunit;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.AI;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Helpers;

namespace UniClub_Hub.Tests.Membership;

public class RoleSuggestionRuleTests
{
    private static async Task<UniClubDbContext> SeedAsync(
        bool departmentHasLead = false,
        bool hasLeadershipPosition = false)
    {
        var db = TestDbContextFactory.Create();
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });
        db.Users.Add(new ApplicationUser
        {
            Id = "u1", UserName = "u1", Email = "u1@test.com",
            NormalizedEmail = "U1@TEST.COM", NormalizedUserName = "U1", SecurityStamp = "x1"
        });
        db.Departments.Add(new Department { Id = 1, ClubId = 1, Name = "Ban Kỹ thuật" });
        db.ClubMemberships.Add(new ClubMembership
        {
            Id = 1, UserId = "u1", ClubId = 1,
            Status = MembershipStatus.Active,
            // 60 days ago — satisfies activeDays >= 30 gate
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-60)),
            ClubRole = ClubRole.MEMBER,
            DepartmentId = 1
        });

        if (departmentHasLead)
        {
            db.Users.Add(new ApplicationUser { Id = "u2", UserName = "u2", NormalizedUserName = "U2", SecurityStamp = "x2" });
            db.ClubMemberships.Add(new ClubMembership
            {
                Id = 2, UserId = "u2", ClubId = 1,
                Status = MembershipStatus.Active,
                JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ClubRole = ClubRole.DEPT_LEAD,
                DepartmentId = 1
            });
        }

        if (hasLeadershipPosition)
        {
            db.ClubPositions.Add(new ClubPosition
            {
                Id = 1, ClubId = 1, DepartmentId = 1,
                Name = "Trưởng nhóm kỹ thuật", IsDeleted = false
            });
            db.ClubMemberPositions.Add(new ClubMemberPosition
            {
                MembershipId = 1, PositionId = 1
            });
        }

        await db.SaveChangesAsync();
        return db;
    }

    private static RoleSuggestionService BuildService(
        UniClubDbContext db,
        string? kpiGrade)
    {
        var mockAi = new Mock<IAiModelClient>();
        mockAi.SetupGet(a => a.IsConfigured).Returns(false);

        var mockPerm = new Mock<IClubPermissionService>();

        var mockKpi = new Mock<IKpiService>();
        if (kpiGrade != null)
        {
            mockKpi
                .Setup(k => k.GetMyResultAsync(
                    It.IsAny<int>(), It.IsAny<DateOnly?>(), It.IsAny<DateOnly?>(),
                    It.IsAny<string>(), It.IsAny<bool>()))
                .ReturnsAsync(new MemberKpiResultDto
                {
                    UserId = "u1",
                    TotalScore = kpiGrade switch
                    {
                        "Xuất sắc" => 95, "Tốt" => 80, "Đạt" => 65, _ => 20
                    },
                    Grade = kpiGrade,
                    Rank = 1,
                    Metrics = []
                });
        }
        else
        {
            // Simulate member has no KPI data in this period
            mockKpi
                .Setup(k => k.GetMyResultAsync(
                    It.IsAny<int>(), It.IsAny<DateOnly?>(), It.IsAny<DateOnly?>(),
                    It.IsAny<string>(), It.IsAny<bool>()))
                .ThrowsAsync(new KeyNotFoundException());
        }

        return new RoleSuggestionService(db, mockAi.Object, mockPerm.Object, mockKpi.Object);
    }

    [Fact]
    public async Task SuggestRole_WithXuatSacGrade_IncludesDeptLeadWithHighConfidence()
    {
        var db = await SeedAsync();
        var svc = BuildService(db, "Xuất sắc");

        var result = await svc.SuggestRoleForMemberAsync(1, 1, "u1", isSuperAdmin: true);

        var deptLead = result.Suggestions.FirstOrDefault(s => s.Role == ClubRole.DEPT_LEAD);
        Assert.NotNull(deptLead);
        Assert.True(deptLead.Confidence >= 0.85);
    }

    [Fact]
    public async Task SuggestRole_WithCanCaiThienGrade_ExcludesDeptLeadSuggestion()
    {
        var db = await SeedAsync();
        var svc = BuildService(db, "Cần cải thiện");

        var result = await svc.SuggestRoleForMemberAsync(1, 1, "u1", isSuperAdmin: true);

        Assert.DoesNotContain(result.Suggestions, s => s.Role == ClubRole.DEPT_LEAD);
    }

    [Fact]
    public async Task SuggestRole_WithNoKpiData_StillReturnsSuggestion()
    {
        var db = await SeedAsync();
        var svc = BuildService(db, kpiGrade: null);

        var result = await svc.SuggestRoleForMemberAsync(1, 1, "u1", isSuperAdmin: true);

        Assert.NotEmpty(result.Suggestions);
        Assert.Equal("Rules", result.Source);
    }

    [Fact]
    public async Task SuggestRole_WhenDepartmentAlreadyHasLead_ExcludesDeptLeadSuggestion()
    {
        var db = await SeedAsync(departmentHasLead: true);
        var svc = BuildService(db, "Xuất sắc");

        var result = await svc.SuggestRoleForMemberAsync(1, 1, "u1", isSuperAdmin: true);

        Assert.DoesNotContain(result.Suggestions, s => s.Role == ClubRole.DEPT_LEAD);
    }

    [Fact]
    public async Task SuggestRole_WithLeadershipPositionAndXuatSac_ConfidenceIsBoosted()
    {
        var dbBase = await SeedAsync(hasLeadershipPosition: false);
        var dbBoosted = await SeedAsync(hasLeadershipPosition: true);

        var baseResult = await BuildService(dbBase, "Xuất sắc")
            .SuggestRoleForMemberAsync(1, 1, "u1", isSuperAdmin: true);
        var boostedResult = await BuildService(dbBoosted, "Xuất sắc")
            .SuggestRoleForMemberAsync(1, 1, "u1", isSuperAdmin: true);

        var baseConf = baseResult.Suggestions.First(s => s.Role == ClubRole.DEPT_LEAD).Confidence;
        var boostedConf = boostedResult.Suggestions.First(s => s.Role == ClubRole.DEPT_LEAD).Confidence;

        Assert.True(boostedConf > baseConf);
        Assert.Equal(0.93, boostedConf); // 0.85 + 0.08 = 0.93
    }
}
