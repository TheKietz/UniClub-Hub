using Xunit;

namespace UniClub_Hub.Tests.Infrastructure;

[Collection("Postgres")]
public abstract class DbTestBase : IAsyncLifetime
{
    protected readonly PostgresFixture Fx;

    protected DbTestBase(PostgresFixture fx)
    {
        Fx = fx;
    }

    public Task InitializeAsync() => Fx.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;
}
