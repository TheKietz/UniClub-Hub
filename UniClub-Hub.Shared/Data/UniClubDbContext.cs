using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Data
{
    public class UniClubDbContext : IdentityDbContext<ApplicationUser>
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        // Các entity không cần audit log (quá noise hoặc tự thân là log)
        private static readonly HashSet<Type> _auditExcluded =
        [
            typeof(AuditLog),
            typeof(RefreshToken),
            typeof(Notification),
            typeof(EventSession),
            typeof(EventStaff),
        ];

        public UniClubDbContext(
            DbContextOptions<UniClubDbContext> options,
            IHttpContextAccessor? httpContextAccessor = null
        )
            : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public DbSet<Category> Categories { get; set; }
        public DbSet<Club> Clubs { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<ClubMembership> ClubMemberships { get; set; }
        public DbSet<LandingPage> LandingPages { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<MediaGallery> MediaGalleries { get; set; }
        public DbSet<ClubEvent> Events { get; set; }
        public DbSet<EventRegistration> EventRegistrations { get; set; }
        public DbSet<ClubTask> Tasks { get; set; }
        public DbSet<ClubApplication> Applications { get; set; }
        public DbSet<Contribution> Contributions { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<TaskAttachment> TaskAttachments { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<TaskComment> TaskComments { get; set; }
        public DbSet<Sprint> Sprints { get; set; }
        public DbSet<TaskDependency> TaskDependencies { get; set; }
        public DbSet<KanbanColumn> KanbanColumns { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<SupportTicket> SupportTickets { get; set; }
        public DbSet<ResignationRequest> ResignationRequests { get; set; }
        public DbSet<EventSession> EventSessions { get; set; }
        public DbSet<EventStaff> EventStaff { get; set; }
        public DbSet<EventAttachment> EventAttachments { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }
        public DbSet<NotificationPreference> NotificationPreferences { get; set; }
        public DbSet<ClubPipelineStage> ClubPipelineStages { get; set; }
        public DbSet<TaskAssignee> TaskAssignees { get; set; }
        public DbSet<EventClubAssignment> EventClubAssignments { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            // Tự động áp dụng tất cả các file có kế thừa IEntityTypeConfiguration trong cùng Assembly
            builder.ApplyConfigurationsFromAssembly(typeof(UniClubDbContext).Assembly);

            // Global Query Filters — tự động lọc soft-deleted records
            builder.Entity<ApplicationUser>().HasQueryFilter(u => !u.IsDeleted);
            builder.Entity<Club>().HasQueryFilter(c => !c.IsDeleted);
            builder.Entity<Department>().HasQueryFilter(d => !d.IsDeleted);
            builder.Entity<ClubEvent>().HasQueryFilter(e => !e.IsDeleted);
            builder.Entity<ClubTask>().HasQueryFilter(t => !t.IsDeleted);

            // JSONB columns (PostgreSQL)
            builder.Entity<Club>().Property(c => c.FormSchema).HasColumnType("jsonb");
            builder.Entity<LandingPage>().Property(lp => lp.SocialLinks).HasColumnType("jsonb");
            builder.Entity<LandingPage>().Property(lp => lp.LayoutSettings).HasColumnType("jsonb");
            builder.Entity<ClubApplication>().Property(a => a.Answers).HasColumnType("jsonb");
            builder.Entity<Sprint>().Property(s => s.ReviewNotes).HasColumnType("jsonb");

            // StudentId unique (bỏ qua NULL)
            builder
                .Entity<ApplicationUser>()
                .HasIndex(u => u.StudentId)
                .IsUnique()
                .HasFilter("\"StudentId\" IS NOT NULL");

            // Club.Code phải unique
            builder.Entity<Club>().HasIndex(c => c.Code).IsUnique();

            // LandingPage — quan hệ 1-1 với Club
            builder
                .Entity<LandingPage>()
                .HasOne(lp => lp.Club)
                .WithOne(c => c.LandingPage)
                .HasForeignKey<LandingPage>(lp => lp.ClubId);

            // ClubTask có 2 FK vào ApplicationUser
            builder
                .Entity<ClubTask>()
                .HasOne(t => t.Assignee)
                .WithMany()
                .HasForeignKey(t => t.AssignedTo)
                .OnDelete(DeleteBehavior.SetNull);

            builder
                .Entity<ClubTask>()
                .HasOne(t => t.Creator)
                .WithMany()
                .HasForeignKey(t => t.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // TaskDependency — composite PK
            builder.Entity<TaskDependency>().HasKey(td => new { td.TaskId, td.DependsOnTaskId });

            builder
                .Entity<TaskDependency>()
                .HasOne(td => td.Task)
                .WithMany(t => t.Dependencies)
                .HasForeignKey(td => td.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<TaskDependency>()
                .HasOne(td => td.DependsOnTask)
                .WithMany()
                .HasForeignKey(td => td.DependsOnTaskId)
                .OnDelete(DeleteBehavior.Restrict);

            // Sprint — belongs to Club, optionally scoped to an Event
            builder
                .Entity<Sprint>()
                .HasOne(s => s.Club)
                .WithMany()
                .HasForeignKey(s => s.ClubId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<Sprint>()
                .HasOne(s => s.Event)
                .WithMany(e => e.Sprints)
                .HasForeignKey(s => s.EventId)
                .OnDelete(DeleteBehavior.SetNull);

            // EventRegistration — one user registers once per event
            builder
                .Entity<EventRegistration>()
                .HasIndex(er => new { er.EventId, er.UserId })
                .IsUnique();

            // KanbanColumn — belongs to Club, optionally scoped to Sprint
            builder
                .Entity<KanbanColumn>()
                .HasOne(c => c.Club)
                .WithMany()
                .HasForeignKey(c => c.ClubId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<KanbanColumn>()
                .HasOne(c => c.Sprint)
                .WithMany()
                .HasForeignKey(c => c.SprintId)
                .OnDelete(DeleteBehavior.SetNull);

            // TaskAssignee — unique (TaskId, UserId), cascade on task delete
            builder.Entity<TaskAssignee>()
                .HasIndex(a => new { a.TaskId, a.UserId })
                .IsUnique();

            builder
                .Entity<TaskAssignee>()
                .HasOne(a => a.Task)
                .WithMany(t => t.Assignees)
                .HasForeignKey(a => a.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<TaskAssignee>()
                .HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes for common Operations queries
            builder.Entity<ClubTask>().HasIndex(t => new { t.ClubId, t.Status });

            builder.Entity<ClubTask>().HasIndex(t => t.AssignedTo);

            builder.Entity<Sprint>().HasIndex(s => new { s.ClubId, s.Status });

            // EventAttachment — cascade delete when event is deleted
            builder
                .Entity<EventAttachment>()
                .HasOne(a => a.Event)
                .WithMany()
                .HasForeignKey(a => a.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<EventAttachment>()
                .HasOne(a => a.UploadedByUser)
                .WithMany()
                .HasForeignKey(a => a.UploadedBy)
                .OnDelete(DeleteBehavior.Restrict);

            builder
                .Entity<EventAttachment>()
                .HasQueryFilter(a => !a.IsDeleted);

            // EventSession — cascade delete when event is deleted
            builder
                .Entity<EventSession>()
                .HasOne(s => s.Event)
                .WithMany(e => e.Sessions)
                .HasForeignKey(s => s.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            // EventStaff — cascade on event delete, restrict on user delete
            builder
                .Entity<EventStaff>()
                .HasOne(es => es.Event)
                .WithMany(e => e.Staff)
                .HasForeignKey(es => es.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            builder
                .Entity<EventStaff>()
                .HasOne(es => es.User)
                .WithMany()
                .HasForeignKey(es => es.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder
                .Entity<EventStaff>()
                .HasIndex(es => new { es.EventId, es.UserId })
                .IsUnique();

            // NotificationPreference — unique per (ClubId, TriggerKey, RecipientRole)
            builder.Entity<NotificationPreference>()
                .HasIndex(np => new { np.ClubId, np.TriggerKey, np.RecipientRole })
                .IsUnique();

            builder.Entity<NotificationPreference>()
                .HasOne(np => np.Club)
                .WithMany()
                .HasForeignKey(np => np.ClubId)
                .OnDelete(DeleteBehavior.Cascade);

            // ClubPipelineStage — cascade when club deleted
            builder.Entity<ClubPipelineStage>()
                .HasOne(s => s.Club)
                .WithMany(c => c.PipelineStages)
                .HasForeignKey(s => s.ClubId)
                .OnDelete(DeleteBehavior.Cascade);

            // ClubApplication.CurrentStage — set null when stage deleted
            builder.Entity<ClubApplication>()
                .HasOne(a => a.CurrentStage)
                .WithMany(s => s.Applications)
                .HasForeignKey(a => a.CurrentStageId)
                .OnDelete(DeleteBehavior.SetNull);

            // ClubEvent → Club: nullable FK (university events have ClubId = null)
            // Cascade: deleting a club deletes its events; university events unaffected
            builder.Entity<ClubEvent>()
                .HasOne(e => e.Club)
                .WithMany()
                .HasForeignKey(e => e.ClubId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);

            // EventClubAssignment — briefs from SUPER_ADMIN to clubs (not real tasks)
            builder.Entity<EventClubAssignment>()
                .HasIndex(a => new { a.EventId, a.ClubId });

            builder.Entity<EventClubAssignment>()
                .HasIndex(a => a.ClubId);
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var currentUserId = _httpContextAccessor
                ?.HttpContext?.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                ?.Value;

            var now = DateTime.UtcNow;

            foreach (var entry in ChangeTracker.Entries())
            {
                if (entry.Entity is IAuditable auditable)
                {
                    if (entry.State == EntityState.Added)
                    {
                        auditable.CreatedAt = now;
                        auditable.CreatedBy = currentUserId;
                        auditable.UpdatedAt = now;
                        auditable.UpdatedBy = currentUserId;
                    }
                    else if (entry.State == EntityState.Modified)
                    {
                        auditable.UpdatedAt = now;
                        auditable.UpdatedBy = currentUserId;
                    }
                }

                if (entry.Entity is ISoftDeletable softDeletable && entry.State == EntityState.Deleted)
                {
                    entry.State = EntityState.Modified;
                    softDeletable.IsDeleted = true;
                    softDeletable.DeletedBy = currentUserId;

                    if (entry.Entity is IAuditable auditableOnDelete)
                    {
                        auditableOnDelete.UpdatedAt = now;
                        auditableOnDelete.UpdatedBy = currentUserId;
                    }
                }
            }

            // Thu thập dữ liệu audit TRƯỚC khi save (để lấy đúng OriginalValues)
            var auditEntries = ChangeTracker
                .Entries()
                .Where(e =>
                    !_auditExcluded.Contains(e.Entity.GetType())
                    && e.State is EntityState.Added or EntityState.Modified
                )
                .Select(e =>
                {
                    // Xác định hành động
                    AuditAction action;
                    if (e.State == EntityState.Added)
                    {
                        action = AuditAction.Create;
                    }
                    else
                    {
                        // Phân biệt soft delete và update thông thường
                        var isDeletedProp = e.Properties.FirstOrDefault(p =>
                            p.Metadata.Name == "IsDeleted"
                        );
                        action =
                            isDeletedProp?.IsModified == true && isDeletedProp.CurrentValue is true
                                ? AuditAction.Delete
                                : AuditAction.Update;
                    }

                    // Ghi lại giá trị cũ trước khi save
                    string? oldValue = e.State == EntityState.Modified ? SerializeValues(e.OriginalValues) : null;

                    return (Entry: e, Action: action, OldValue: oldValue);
                })
                .ToList(); // force evaluation TRƯỚC base.SaveChangesAsync

            var result = await base.SaveChangesAsync(cancellationToken);

            // Sau khi save, ID đã được sinh ra cho các entity Added
            if (auditEntries.Count > 0)
            {
                var logs = auditEntries
                    .Select(a =>
                    {
                        var keyProp = a
                            .Entry.Metadata.FindPrimaryKey()
                            ?.Properties.FirstOrDefault();
                        var entityId =
                            keyProp != null
                                ? a.Entry.Property(keyProp.Name).CurrentValue?.ToString() ?? ""
                                : "";

                        return new AuditLog
                        {
                            UserId = currentUserId,
                            Action = a.Action,
                            EntityName = a.Entry.Entity.GetType().Name,
                            EntityId = entityId,
                            OldValue = a.OldValue,
                            NewValue =
                                a.Action != AuditAction.Delete
                                    ? SerializeValues(a.Entry.CurrentValues)
                                    : null,
                            Timestamp = now,
                        };
                    })
                    .ToList();

                AuditLogs.AddRange(logs);
                await base.SaveChangesAsync(cancellationToken);
            }

            return result;
        }

        private static string SerializeValues(
            Microsoft.EntityFrameworkCore.ChangeTracking.PropertyValues values
        )
        {
            var dict = values.Properties.ToDictionary(p => p.Name, p => values[p]?.ToString());
            return JsonSerializer.Serialize(dict);
        }
    }
}
