using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniClub_Hub.Membership
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddMembershipServices(this IServiceCollection services)
        {
            // Đăng ký các Service 
            //vd: services.AddScoped<IEventService, EventService>();
            return services;
        }
    }
}
