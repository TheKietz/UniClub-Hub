using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Club;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Membership;

public class ClubServiceCrudTests : DbTestBase
{
    public ClubServiceCrudTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task CreateAsync_WithValidData_CreatesClubAdminAndPipeline()
    {
        await using var db = Fx.CreateDbContext();
        db.Users.Add(PagedServiceTestHelpers.User(1, "Admin User", "admin@uef.edu.vn", "S001"));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubServiceWithMembership(db);

        var result = await service.CreateAsync(new CreateClubDto
        {
            Name = "Robotics Club",
            Code = "ROBO",
            ClubAdminId = "u1",
            Description = "Build robots"
        });

        Assert.Equal("Robotics Club", result.Name);
        Assert.Equal("ROBO", result.Code);
        var adminMembership = await db.ClubMemberships
            .FirstOrDefaultAsync(m => m.ClubId == result.Id && m.UserId == "u1");
        Assert.NotNull(adminMembership);
        Assert.Equal(ClubRole.CLUB_ADMIN, adminMembership!.ClubRole);
        Assert.Equal(3, await db.ClubPipelineStages.CountAsync(s => s.ClubId == result.Id));
    }

    [Fact]
    public async Task CreateAsync_WithDuplicateCode_ThrowsInvalidOperation()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Existing", "DUP"));
        db.Users.Add(PagedServiceTestHelpers.User(1));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubServiceWithMembership(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(new CreateClubDto
            {
                Name = "Another Club",
                Code = "dup",
                ClubAdminId = "u1"
            }));
    }

    [Fact]
    public async Task UpdateAsync_WithValidData_UpdatesClub()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "Old Name", "OLD", status: ClubStatus.Active));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubServiceWithMembership(db);

        var result = await service.UpdateAsync(1, new UpdateClubDto
        {
            Name = "New Name",
            Status = ClubStatus.Inactive,
            Description = "Updated"
        });

        Assert.Equal("New Name", result.Name);
        Assert.Equal(ClubStatus.Inactive, result.Status);
        Assert.Equal("Updated", db.Clubs.Find(1)!.Description);
    }

    [Fact]
    public async Task DeleteAsync_WithExistingClub_RemovesClub()
    {
        await using var db = Fx.CreateDbContext();
        db.Clubs.Add(PagedServiceTestHelpers.Club(1, "To Delete", "DEL"));
        await db.SaveChangesAsync();

        var service = PagedServiceTestHelpers.CreateClubServiceWithMembership(db);

        await service.DeleteAsync(1);

        Assert.False(await db.Clubs.AnyAsync(c => c.Id == 1));
    }
}
