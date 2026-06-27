using Microsoft.EntityFrameworkCore;
using Npgsql;
using Respawn;
using Testcontainers.PostgreSql;
using UniClub_Hub.Shared.Data;
using Xunit;

namespace UniClub_Hub.Tests.Infrastructure;

public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    private Respawner _respawner = null!;

    public string ConnectionString => _db.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _db.StartAsync();

        await using var ctx = CreateDbContext();
        await ctx.Database.EnsureCreatedAsync();

        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();
        _respawner = await Respawner.CreateAsync(conn, new RespawnerOptions
        {
            DbAdapter = DbAdapter.Postgres,
            SchemasToInclude = ["public"],
        });
    }

    public UniClubDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<UniClubDbContext>()
            .UseNpgsql(ConnectionString)
            .Options);

    public async Task ResetAsync()
    {
        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();
        await _respawner.ResetAsync(conn);
    }

    public Task DisposeAsync() => _db.DisposeAsync().AsTask();
}

[CollectionDefinition("Postgres")]
public sealed class PostgresCollection : ICollectionFixture<PostgresFixture>
{
}
