using Microsoft.Extensions.DependencyInjection;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;

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
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IStatsService, StatsService>();
            services.AddScoped<INotificationService, NotificationService>();
            services.AddScoped<IExportService, ExportService>();
            services.AddScoped<ImportService>();
            services.AddScoped<AdminImportService>();
            services.AddScoped<ISupportService, SupportService>();
            services.AddScoped<IResignationService, ResignationService>();
            services.AddScoped<IClubAuditLogService, ClubAuditLogService>();
            services.AddScoped<ISystemSettingService, SystemSettingService>();
            services.AddScoped<INotificationDispatchService, NotificationDispatchService>();
            services.AddScoped<INotificationPreferenceService, NotificationPreferenceService>();
            services.AddScoped<IPipelineService, PipelineService>();
            return services;
        }
    }
}
