using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniClub_Hub.Operations
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddOperationsServices(this IServiceCollection services)
        {
            // Đăng ký các Service 
            //vd: services.AddScoped<IEventService, EventService>();
            return services;
        }
    }
}
