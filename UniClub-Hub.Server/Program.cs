using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using UniClub_Hub.Membership;
using UniClub_Hub.Operations;
using UniClub_Hub.Portal;
using UniClub_Hub.Server.Hubs;
using UniClub_Hub.Server.Services;
using UniClub_Hub.Operations.Services.Interfaces;
using UniClub_Hub.Shared.AI;
using UniClub_Hub.Shared.Common.Storage;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Email;
using UniClub_Hub.Shared.Models;
using CloudinaryDotNet;
using UniClub_Hub.Shared.Common.Interfaces;
using UniClub_Hub.Membership.Services.Implements;

// Npgsql 6+ requires DateTimeOffset values sent to timestamptz to be UTC.
// This switch lets Npgsql accept any offset and convert to UTC on write,
// matching the pre-6.0 behaviour across the whole application.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Render (and similar PaaS) inject PORT — must bind to it, not a fixed 8080.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://+:{port}");

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddDbContext<UniClubDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

builder
    .Services.AddOpenTelemetry()
    .WithTracing(tracing =>
        tracing
            .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("UniClubHub"))
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter()
    );

builder
    .Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 6;
    })
    .AddEntityFrameworkStores<UniClubDbContext>()
    .AddDefaultTokenProviders();

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? builder.Configuration["Cors:AllowedOrigins"]?
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? ["https://localhost:54610", "http://localhost:54610"];

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowReactApp",
        policy =>
        {
            policy
                .WithOrigins(corsOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    );
});

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder
    .Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };
        // SignalR sends the token as a query param during WebSocket handshake
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var token = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    context.Token = token;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection("Gemini"));
builder.Services.AddHttpClient<IAiModelClient, GeminiAiModelClient>()
    .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(20));

builder.Services.AddRateLimiter(options =>
{
    if (builder.Environment.IsEnvironment("Testing"))
    {
        static System.Threading.RateLimiting.RateLimitPartition<string> NoLimit(
            Microsoft.AspNetCore.Http.HttpContext _) =>
            System.Threading.RateLimiting.RateLimitPartition.GetNoLimiter(string.Empty);

        options.AddPolicy("auth:login", NoLimit);
        options.AddPolicy("auth:register", NoLimit);
        options.AddPolicy("auth:forgot", NoLimit);
        options.AddPolicy("auth:resend", NoLimit);
        return;
    }

    options.RejectionStatusCode = 429;

    static System.Threading.RateLimiting.RateLimitPartition<string> ByIp(
        Microsoft.AspNetCore.Http.HttpContext ctx, int permits, int windowSec) =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = permits,
                Window = TimeSpan.FromSeconds(windowSec),
                QueueLimit = 0,
            });

    options.AddPolicy("auth:login",      ctx => ByIp(ctx, 10, 60));
    options.AddPolicy("auth:register",   ctx => ByIp(ctx, 5,  60));
    options.AddPolicy("auth:forgot",     ctx => ByIp(ctx, 5,  60));
    options.AddPolicy("auth:resend",     ctx => ByIp(ctx, 5,  60));
});
if (builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddScoped<IFileStorageService, UniClub_Hub.Server.Testing.TestingFileStorageService>();
}
else
{
var cloudinaryAccount = new Account(
    builder.Configuration["Cloudinary:CloudName"],
    builder.Configuration["Cloudinary:ApiKey"],
    builder.Configuration["Cloudinary:ApiSecret"]
);
builder.Services.AddSingleton(new Cloudinary(cloudinaryAccount));
builder.Services.AddScoped<IFileStorageService, CloudinaryStorageService>();
}
builder.Services.AddScoped<IEmailService, SendGridEmailService>();
builder.Services.AddScoped<IKanbanHubNotifier, KanbanHubNotifier>();
builder.Services.AddScoped<UniClub_Hub.Shared.Common.Interfaces.IRealtimeNotifier, RealtimeNotifier>();
builder.Services.AddScoped<UniClub_Hub.Shared.Common.Interfaces.INotificationService, NotificationService>();
builder.Services.AddMembershipServices();
builder.Services.AddOperationsServices();
builder.Services.AddPortalServices();
builder.Services.AddHostedService<UniClub_Hub.Server.BackgroundServices.DatabaseMigrationHostedService>();
builder.Services.AddHostedService<UniClub_Hub.Server.BackgroundServices.ReminderHostedService>();

var app = builder.Build();

app.UseForwardedHeaders();

app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var configuredUrls = builder.Configuration["ASPNETCORE_URLS"] ?? string.Empty;
if (configuredUrls.Contains("https", StringComparison.OrdinalIgnoreCase))
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowReactApp");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// API responses không được cache ở trình duyệt — tránh F5 hiện data cũ (vd Settings vừa lưu)
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
        context.Response.Headers.CacheControl = "no-store";
    await next();
});

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapControllers();
app.MapHub<KanbanHub>("/hubs/kanban");
app.MapFallbackToFile("/index.html");

app.Run();

public partial class Program { }
