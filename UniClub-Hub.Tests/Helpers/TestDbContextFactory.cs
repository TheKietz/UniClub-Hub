using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Shared.Data;

namespace UniClub_Hub.Tests.Helpers;

public static class TestDbContextFactory
{
    public static UniClubDbContext Create() =>
        new(new DbContextOptionsBuilder<UniClubDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
}
