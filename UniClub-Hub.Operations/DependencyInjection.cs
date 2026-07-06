using Microsoft.Extensions.DependencyInjection;
using UniClub_Hub.Operations.Services.Implements;
using UniClub_Hub.Operations.Services.Interfaces;


namespace UniClub_Hub.Operations
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddOperationsServices(this IServiceCollection services)
        {
            // QuestPDF requires a license to be set once before any document is generated.
            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

            services.AddScoped<IExportService, ExportService>();
            services.AddScoped<IEventService, EventService>();
            services.AddScoped<ITaskService, TaskService>();
            services.AddScoped<ISprintService, SprintService>();
            services.AddScoped<IAuditLogService, AuditLogService>();
            services.AddScoped<IKanbanColumnService, KanbanColumnService>();
            services.AddScoped<ITaskCommentService, TaskCommentService>();
            services.AddScoped<ITaskAttachmentService, TaskAttachmentService>();
            services.AddScoped<ITaskAssigneeService, TaskAssigneeService>();
            services.AddScoped<IKpiService, KpiService>();
            services.AddScoped<ITaskIntelligenceService, TaskIntelligenceService>();
            services.AddScoped<IEventAssignmentService, EventAssignmentService>();
            services.AddScoped<IContributionAwardService, ContributionAwardService>();
            return services;
        }
    }
}
