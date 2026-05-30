using Microsoft.Extensions.DependencyInjection;
using UniClub_Hub.Portal.Services.Implements;
using UniClub_Hub.Portal.Services.Interfaces;

namespace UniClub_Hub.Portal
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddPortalServices(this IServiceCollection services)
        {
            services.AddScoped<IPortalService, PortalService>();
            return services;
        }
    }
}
