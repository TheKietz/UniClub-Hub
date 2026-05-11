using Microsoft.Extensions.DependencyInjection;
using UniClub_Hub.Operations.Services.Implements;
using UniClub_Hub.Operations.Services.Interfaces;

namespace UniClub_Hub.Operations
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddOperationsServices(this IServiceCollection services)
        {
            services.AddScoped<IEventService, EventService>();
            services.AddScoped<ITaskService, TaskService>();
            services.AddScoped<ISprintService, SprintService>();
            return services;
        }
    }
}
