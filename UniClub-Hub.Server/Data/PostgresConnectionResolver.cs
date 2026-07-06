using Npgsql;

namespace UniClub_Hub.Server.Data;

internal static class PostgresConnectionResolver
{
    public static string Resolve(IConfiguration configuration)
    {
        var raw = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["DATABASE_URL"]
            ?? Environment.GetEnvironmentVariable("DATABASE_URL");

        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new InvalidOperationException(
                "PostgreSQL connection string is missing. On Render, link the web service to "
                + "uniclub-hub-db or set ConnectionStrings__DefaultConnection / DATABASE_URL.");
        }

        raw = raw.Trim().Trim('"');

        if (raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            || raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return ConvertPostgresUri(raw);
        }

        // Validate early so startup logs a clear error for malformed ADO.NET strings.
        _ = new NpgsqlConnectionStringBuilder(raw);
        return raw;
    }

    private static string ConvertPostgresUri(string uriString)
    {
        var uri = new Uri(uriString);
        var userInfo = uri.UserInfo.Split(':', 2);

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : string.Empty,
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
            SslMode = SslMode.Require,
            TrustServerCertificate = true,
        };

        return builder.ConnectionString;
    }
}
