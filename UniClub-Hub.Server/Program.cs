using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using UniClub_Hub.Membership;
using UniClub_Hub.Operations;
using UniClub_Hub.Portal;
using UniClub_Hub.Shared.Common.Helper;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;
using Npgsql;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry; 

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();

builder.Services.AddDbContext<UniClubDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("UniClubHub"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddNpgsql()
        .AddOtlpExporter());

// Cấu hình Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options => {
    options.Password.RequireDigit = false; 
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<UniClubDbContext>()
.AddDefaultTokenProviders();
// Cấu hình CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("https://localhost:54610", "http://localhost:54610")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
// Cấu hình JWT Authentication
// Lấy giá trị Key từ file appsettings.json
var jwtKey = builder.Configuration["Jwt:Key"];

builder.Services.AddAuthentication(options => {
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options => {
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false, // Tạm thời tắt để test cho nhanh
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!))
    };
});

builder.Services.AddAuthorization();

// Đăng ký FileUploadHelper để có thể inject vào các controller hoặc service khác
builder.Services.AddScoped<FileUploadHelper>();
// Đăng ký các service từ các module khác nhau
builder.Services.AddOperationsServices();
builder.Services.AddMembershipServices();
builder.Services.AddPortalServices();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();


app.UseCors("AllowReactApp");
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();

