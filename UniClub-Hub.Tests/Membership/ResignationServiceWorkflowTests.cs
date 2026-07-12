using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Resignation;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ResignationServiceWorkflowTests : DbTestBase
{
    public ResignationServiceWorkflowTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task SubmitAsync_WithDeptLead_CreatesPendingRequest()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Dept Lead", "lead@uef.edu.vn", "S001"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Su kien"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            1, "u1", role: ClubRole.DEPT_LEAD, departmentId: 1));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        var result = await service.SubmitAsync(1, "u1", new SubmitResignationDto
        {
            Preference = ResignationPreference.BecomeMember
        });

        Assert.Equal(ResignationStatus.Pending, result.Status);
        Assert.Single(await db.ResignationRequests.Where(r => r.UserId == "u1").ToListAsync());
    }

    [Fact]
    public async Task SubmitAsync_WithRegularMember_ThrowsInvalidOperation()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u1", role: ClubRole.MEMBER));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SubmitAsync(1, "u1", new SubmitResignationDto
            {
                Preference = ResignationPreference.LeaveClub
            }));
    }

    [Fact]
    public async Task ReviewAsync_WithApprovedBecomeMember_DemotesToMember()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Dept Lead", "lead@uef.edu.vn", "S001"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Su kien"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            1, "u1", role: ClubRole.DEPT_LEAD, departmentId: 1));
        db.ResignationRequests.Add(PagedServiceTestHelpers.Resignation(1, "u1", 1));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        var result = await service.ReviewAsync(1, new ReviewResignationDto
        {
            Status = ResignationStatus.Approved,
            ReviewNote = "Approved"
        }, "reviewer", isSuperAdmin: true);

        var membership = await db.ClubMemberships.FindAsync(1);
        Assert.Equal(ResignationStatus.Approved, result.Status);
        Assert.Equal(ClubRole.MEMBER, membership!.ClubRole);
        Assert.Null(membership.DepartmentId);
        Assert.Equal(MembershipStatus.Active, membership.Status);
    }

    [Fact]
    public async Task ReviewAsync_WithApprovedLeaveClub_SetsResignedStatus()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Club Admin", "admin@uef.edu.vn", "S001"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(1, "u1", role: ClubRole.CLUB_ADMIN));
        db.ResignationRequests.Add(new UniClub_Hub.Shared.Models.ResignationRequest
        {
            Id = 1,
            UserId = "u1",
            ClubId = 1,
            MembershipId = 1,
            Preference = ResignationPreference.LeaveClub,
            Status = ResignationStatus.Pending,
            RequestedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        await service.ReviewAsync(1, new ReviewResignationDto
        {
            Status = ResignationStatus.Approved
        }, "reviewer", isSuperAdmin: true);

        var membership = await db.ClubMemberships.FindAsync(1);
        Assert.Equal(MembershipStatus.Resigned, membership!.Status);
        Assert.NotNull(membership.ResignedDate);
    }

    [Fact]
    public async Task ReviewAsync_WithApprovedLeaveClub_ResignsActiveRowAndKeepsHistory()
    {
        // DB có unique index (ClubId, UserId) WHERE Status IN (Active, Probation) nên user chỉ có
        // tối đa 1 dòng đang hoạt động; dòng Resigned cũ là lịch sử và không được đụng tới.
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Dept Lead", "lead@uef.edu.vn", "S001"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Ky thuat"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            1, "u1", role: ClubRole.DEPT_LEAD, departmentId: 1));
        var historical = PagedServiceTestHelpers.Membership(
            2, "u1", role: ClubRole.MEMBER, status: MembershipStatus.Resigned);
        historical.ResignedDate = new DateOnly(2025, 6, 30);
        db.ClubMemberships.Add(historical);
        db.ResignationRequests.Add(new UniClub_Hub.Shared.Models.ResignationRequest
        {
            Id = 1,
            UserId = "u1",
            ClubId = 1,
            MembershipId = 1,
            Preference = ResignationPreference.LeaveClub,
            Status = ResignationStatus.Pending,
            RequestedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        await service.ReviewAsync(1, new ReviewResignationDto
        {
            Status = ResignationStatus.Approved
        }, "reviewer", isSuperAdmin: true);

        var active = await db.ClubMemberships.FindAsync(1);
        var history = await db.ClubMemberships.FindAsync(2);
        Assert.Equal(MembershipStatus.Resigned, active!.Status);
        Assert.Equal(new DateOnly(2025, 6, 30), history!.ResignedDate); // lịch sử giữ nguyên
    }

    [Fact]
    public async Task SubmitAsync_WithResignedMemberRowFirst_PicksActiveLeadershipRow()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Multi Row", "multi@uef.edu.vn", "S001"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Ky thuat"));
        // Dòng MEMBER cũ (đã Resigned) có Id nhỏ hơn — service phải bỏ qua và chọn dòng lead Active
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            1, "u1", role: ClubRole.MEMBER, status: MembershipStatus.Resigned));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            2, "u1", role: ClubRole.DEPT_LEAD, departmentId: 1));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        var result = await service.SubmitAsync(1, "u1", new SubmitResignationDto
        {
            Preference = ResignationPreference.BecomeMember
        });

        Assert.Equal(2, result.MembershipId);
        Assert.Equal(ClubRole.DEPT_LEAD.ToString(), result.ClubRole);
    }

    [Fact]
    public async Task ReviewAsync_WithApprovedLeaveClub_AutoRejectsOtherPendingRequests()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1, "Dept Lead", "lead@uef.edu.vn", "S001"));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Ky thuat"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            1, "u1", role: ClubRole.DEPT_LEAD, departmentId: 1));
        db.ResignationRequests.Add(PagedServiceTestHelpers.Resignation(1, "u1", 1)); // BecomeMember, Pending
        db.ResignationRequests.Add(new UniClub_Hub.Shared.Models.ResignationRequest
        {
            Id = 2,
            UserId = "u1",
            ClubId = 1,
            MembershipId = 1,
            Preference = ResignationPreference.LeaveClub,
            Status = ResignationStatus.Pending,
            RequestedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        await service.ReviewAsync(2, new ReviewResignationDto
        {
            Status = ResignationStatus.Approved
        }, "reviewer", isSuperAdmin: true);

        var otherRequest = await db.ResignationRequests.FindAsync(1);
        Assert.Equal(ResignationStatus.Rejected, otherRequest!.Status);
        Assert.NotNull(otherRequest.ReviewedAt);
    }

    [Fact]
    public async Task ReviewAsync_WithApprovedBecomeMember_OnResignedMembership_ThrowsInvalidOperation()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Su kien"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            1, "u1", role: ClubRole.DEPT_LEAD, status: MembershipStatus.Resigned, departmentId: 1));
        db.ResignationRequests.Add(PagedServiceTestHelpers.Resignation(1, "u1", 1));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ReviewAsync(1, new ReviewResignationDto
            {
                Status = ResignationStatus.Approved
            }, "reviewer", isSuperAdmin: true));
    }

    [Fact]
    public async Task ReviewAsync_WithRejected_KeepsOriginalRole()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Su kien"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            1, "u1", role: ClubRole.DEPT_LEAD, departmentId: 1));
        db.ResignationRequests.Add(PagedServiceTestHelpers.Resignation(1, "u1", 1));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        await service.ReviewAsync(1, new ReviewResignationDto
        {
            Status = ResignationStatus.Rejected,
            ReviewNote = "Stay as lead"
        }, "reviewer", isSuperAdmin: true);

        var membership = await db.ClubMemberships.FindAsync(1);
        Assert.Equal(ClubRole.DEPT_LEAD, membership!.ClubRole);
        Assert.Equal(1, membership.DepartmentId);
        Assert.Equal(MembershipStatus.Active, membership.Status);
    }

    [Fact]
    public async Task ReviewAsync_WhenReviewerIsApplicant_ThrowsInvalidOperation()
    {
        await using var db = Fx.CreateDbContext();
        SeedClub(db);
        db.Users.Add(PagedServiceTestHelpers.User(1));
        db.Departments.Add(PagedServiceTestHelpers.Department(1, 1, "Ban Su kien"));
        db.ClubMemberships.Add(PagedServiceTestHelpers.Membership(
            1, "u1", role: ClubRole.DEPT_LEAD, departmentId: 1));
        db.ResignationRequests.Add(PagedServiceTestHelpers.Resignation(1, "u1", 1));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateResignationService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ReviewAsync(1, new ReviewResignationDto
            {
                Status = ResignationStatus.Approved
            }, "u1", isSuperAdmin: true));
    }

    private static void SeedClub(UniClub_Hub.Shared.Data.UniClubDbContext db)
    {
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Test Club", "TEST"));
    }
}
