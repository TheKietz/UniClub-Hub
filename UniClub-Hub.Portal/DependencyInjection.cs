using Microsoft.Extensions.DependencyInjection;

namespace UniClub_Hub.Portal
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddPortalServices(this IServiceCollection services)
        {
            // Đăng ký các Service 
            //vd: services.AddScoped<IEventService, EventService>();
            return services;
        }
    }
}
