using UniClub_Hub.Operations.DTOs.Kanban;
using UniClub_Hub.Operations.Services.Implements;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Tests.Infrastructure;
using Xunit;

namespace UniClub_Hub.Tests.Operations;

public class KanbanColumnServiceTests : DbTestBase
{
    public KanbanColumnServiceTests(PostgresFixture fx) : base(fx)
    {
    }

    [Fact]
    public async Task ReorderColumns_ShouldUpdateOrderCorrectly()
    {
        var db = Fx.CreateDbContext();
        db.Clubs.Add(new Club { Id = 1, Name = "CLB Test", Code = "TEST" });

        var c1 = new KanbanColumn { ClubId = 1, Name = "A", SortOrder = 0, CreatedAt = DateTime.UtcNow };
        var c2 = new KanbanColumn { ClubId = 1, Name = "B", SortOrder = 1, CreatedAt = DateTime.UtcNow };
        var c3 = new KanbanColumn { ClubId = 1, Name = "C", SortOrder = 2, CreatedAt = DateTime.UtcNow };
        db.KanbanColumns.AddRange(c1, c2, c3);
        await db.SaveChangesAsync();

        var svc = new KanbanColumnService(db);

        // New order: C, A, B → SortOrder should become 0, 1, 2 respectively.
        await svc.ReorderAsync(1, new ReorderKanbanColumnsDto { OrderedIds = [c3.Id, c1.Id, c2.Id] });

        var reordered = Fx.CreateDbContext();
        Assert.Equal(0, (await reordered.KanbanColumns.FindAsync(c3.Id))!.SortOrder);
        Assert.Equal(1, (await reordered.KanbanColumns.FindAsync(c1.Id))!.SortOrder);
        Assert.Equal(2, (await reordered.KanbanColumns.FindAsync(c2.Id))!.SortOrder);
    }
}
