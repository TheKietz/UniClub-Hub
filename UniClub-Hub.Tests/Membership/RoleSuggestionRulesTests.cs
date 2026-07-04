using UniClub_Hub.Membership.Services.Roles;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class RoleSuggestionRulesTests
{
    private static ClubMembership CreateMembership(
        int activeDaysAgo = 60,
        ClubRole role = ClubRole.MEMBER,
        int? departmentId = 1)
    {
        return new ClubMembership
        {
            Id = 1,
            UserId = "u1",
            ClubId = 1,
            ClubRole = role,
            Status = MembershipStatus.Active,
            DepartmentId = departmentId,
            JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-activeDaysAgo)),
            User = new ApplicationUser
            {
                Id = "u1",
                UserName = "u1",
                Email = "u1@test.com",
                FullName = "Test Member",
            },
            Department = departmentId.HasValue
                ? new Department { Id = departmentId.Value, ClubId = 1, Name = "Ban Kỹ thuật" }
                : null,
        };
    }

    private static RoleSuggestionContext CreateContext(
        string? kpiGrade = "Xuất sắc",
        bool departmentHasLead = false,
        bool hasLeadershipPosition = false,
        int contributionPoints = 10,
        int tasksDone = 0,
        int tasksTotal = 0)
    {
        var departments = new List<DepartmentSignal>
        {
            new(1, "Ban Kỹ thuật", "Tech team"),
        };

        var positions = hasLeadershipPosition
            ? new List<PositionSignal> { new(1, "Trưởng nhóm kỹ thuật", "Ban Kỹ thuật") }
            : [];

        return new RoleSuggestionContext(
            Club: new ClubSignal(1, "CLB Test", "Desc"),
            Member: new MemberSignal(
                1, "u1", "Test Member", "S001", "CNTT", ClubRole.MEMBER.ToString(),
                1, "Ban Kỹ thuật", MembershipStatus.Active.ToString(),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-60)), null),
            Departments: departments,
            CurrentDeptLeadDepartmentIds: departmentHasLead ? [1] : [],
            Contribution: new ContributionSignal(contributionPoints, 1, []),
            Tasks: new TaskSignal(tasksTotal, tasksDone, 0, 0),
            Application: null,
            Kpi: kpiGrade == null
                ? null
                : new KpiSignal(
                    kpiGrade == "Xuất sắc" ? 95 : kpiGrade == "Tốt" ? 80 : kpiGrade == "Đạt" ? 65 : 20,
                    kpiGrade,
                    1,
                    []),
            Positions: positions);
    }

    [Fact]
    public void BuildRuleBasedSuggestion_WithCustomGradeLabelAndHighScore_UsesScoreThresholds()
    {
        var membership = CreateMembership();
        var context = new RoleSuggestionContext(
            Club: new ClubSignal(1, "CLB Test", "Desc"),
            Member: new MemberSignal(
                1, "u1", "Test Member", "S001", "CNTT", ClubRole.MEMBER.ToString(),
                1, "Ban Kỹ thuật", MembershipStatus.Active.ToString(),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-60)), null),
            Departments: [new DepartmentSignal(1, "Ban Kỹ thuật", "Tech team")],
            CurrentDeptLeadDepartmentIds: [],
            Contribution: new ContributionSignal(10, 1, []),
            Tasks: new TaskSignal(0, 0, 0, 0),
            Application: null,
            Kpi: new KpiSignal(95, "A", 1, []),
            Positions: []);

        var result = RoleSuggestionRules.BuildRuleBasedSuggestion(membership, context);

        Assert.Contains(result.Suggestions, s => s.Role == ClubRole.DEPT_LEAD);
    }

    [Fact]
    public void BuildRuleBasedSuggestion_WithXuatSacAndOpenDepartment_IncludesDeptLeadWithHighConfidence()
    {
        var membership = CreateMembership();
        var context = CreateContext(kpiGrade: "Xuất sắc");

        var result = RoleSuggestionRules.BuildRuleBasedSuggestion(membership, context);

        var deptLead = result.Suggestions.FirstOrDefault(s => s.Role == ClubRole.DEPT_LEAD);
        Assert.NotNull(deptLead);
        Assert.True(deptLead.Confidence >= 0.85);
        Assert.Equal("Rules", result.Source);
    }

    [Fact]
    public void BuildRuleBasedSuggestion_WithCanCaiThienGrade_ExcludesDeptLeadSuggestion()
    {
        var membership = CreateMembership();
        var context = CreateContext(kpiGrade: "Cần cải thiện");

        var result = RoleSuggestionRules.BuildRuleBasedSuggestion(membership, context);

        Assert.DoesNotContain(result.Suggestions, s => s.Role == ClubRole.DEPT_LEAD);
    }

    [Fact]
    public void BuildRuleBasedSuggestion_WhenDepartmentAlreadyHasLead_ExcludesDeptLeadSuggestion()
    {
        var membership = CreateMembership();
        var context = CreateContext(kpiGrade: "Xuất sắc", departmentHasLead: true);

        var result = RoleSuggestionRules.BuildRuleBasedSuggestion(membership, context);

        Assert.DoesNotContain(result.Suggestions, s => s.Role == ClubRole.DEPT_LEAD);
    }

    [Fact]
    public void BuildRuleBasedSuggestion_WithLeadershipPositionAndXuatSac_BoostsConfidence()
    {
        var membership = CreateMembership();
        var baseResult = RoleSuggestionRules.BuildRuleBasedSuggestion(
            membership, CreateContext(kpiGrade: "Xuất sắc"));
        var boostedResult = RoleSuggestionRules.BuildRuleBasedSuggestion(
            membership, CreateContext(kpiGrade: "Xuất sắc", hasLeadershipPosition: true));

        var baseConf = baseResult.Suggestions.First(s => s.Role == ClubRole.DEPT_LEAD).Confidence;
        var boostedConf = boostedResult.Suggestions.First(s => s.Role == ClubRole.DEPT_LEAD).Confidence;

        Assert.True(boostedConf > baseConf);
        Assert.Equal(0.93, boostedConf);
    }

    [Fact]
    public void BuildRuleBasedSuggestion_WithLowTenure_ExcludesDeptLeadButKeepsMemberSuggestion()
    {
        var membership = CreateMembership(activeDaysAgo: 10);
        var context = CreateContext(kpiGrade: "Xuất sắc");

        var result = RoleSuggestionRules.BuildRuleBasedSuggestion(membership, context);

        Assert.DoesNotContain(result.Suggestions, s => s.Role == ClubRole.DEPT_LEAD);
        Assert.Contains(result.Suggestions, s => s.Role == ClubRole.MEMBER);
    }

    [Fact]
    public void BuildRuleBasedSuggestion_WithNoKpiData_StillReturnsSuggestion()
    {
        var membership = CreateMembership();
        var context = CreateContext(
            kpiGrade: null,
            contributionPoints: 40,
            tasksDone: 7,
            tasksTotal: 10);

        var result = RoleSuggestionRules.BuildRuleBasedSuggestion(membership, context);

        Assert.NotEmpty(result.Suggestions);
        Assert.Equal("Rules", result.Source);
        Assert.Contains(result.Suggestions, s => s.Role == ClubRole.DEPT_LEAD);
    }
}
