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
