using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;
using UniClub_Hub.Shared.Common.Helper;
using UniClub_Hub.Membership;
using UniClub_Hub.Operations;
using UniClub_Hub.Portal;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<UniClubDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Cấu hình Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options => {
    options.Password.RequireDigit = false; 
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<UniClubDbContext>()
.AddDefaultTokenProviders();

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


app.MapFallbackToFile("/index.html");

app.Run();

