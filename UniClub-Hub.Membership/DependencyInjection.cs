using Microsoft.Extensions.DependencyInjection;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Membership
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddMembershipServices(this IServiceCollection services)
        {
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<ICategoryService, CategoryService>();
            services.AddScoped<IClubService, ClubService>();
            services.AddScoped<IDepartmentService, DepartmentService>();
            services.AddScoped<IClubMembershipService, ClubMembershipService>();
            services.AddScoped<IApplicationService, ApplicationService>();
            services.AddScoped<IFileStorageService, CloudinaryStorageService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IStatsService, StatsService>();
            services.AddScoped<INotificationService, NotificationService>();
            services.AddScoped<IExportService, ExportService>();
            services.AddScoped<ImportService>();
            return services;
        }
    }
}
