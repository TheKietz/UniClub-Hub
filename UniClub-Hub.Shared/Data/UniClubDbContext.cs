using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Data
{
    public class UniClubDbContext : IdentityDbContext<ApplicationUser>
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public UniClubDbContext(DbContextOptions<UniClubDbContext> options,
            IHttpContextAccessor? httpContextAccessor = null) : base(options)
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
        public DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Global Query Filters — tự động lọc soft-deleted records
            builder.Entity<ApplicationUser>().HasQueryFilter(u => !u.IsDeleted);
            builder.Entity<Club>().HasQueryFilter(c => !c.IsDeleted);
            builder.Entity<Department>().HasQueryFilter(d => !d.IsDeleted);

            // JSONB columns (PostgreSQL)
            builder.Entity<Club>().Property(c => c.FormSchema).HasColumnType("jsonb");
            builder.Entity<LandingPage>().Property(lp => lp.SocialLinks).HasColumnType("jsonb");
            builder.Entity<LandingPage>().Property(lp => lp.LayoutSettings).HasColumnType("jsonb");
            builder.Entity<ClubApplication>().Property(a => a.Answers).HasColumnType("jsonb");

            // StudentId unique (bỏ qua NULL)
            builder.Entity<ApplicationUser>()
                .HasIndex(u => u.StudentId)
                .IsUnique()
                .HasFilter("\"StudentId\" IS NOT NULL");

            // Club.Code phải unique
            builder.Entity<Club>().HasIndex(c => c.Code).IsUnique();

            // LandingPage — quan hệ 1-1 với Club
            builder.Entity<LandingPage>()
                .HasOne(lp => lp.Club)
                .WithOne(c => c.LandingPage)
                .HasForeignKey<LandingPage>(lp => lp.ClubId);

            // ClubTask có 2 FK vào ApplicationUser
            builder.Entity<ClubTask>()
                .HasOne(t => t.Assignee)
                .WithMany()
                .HasForeignKey(t => t.AssignedTo)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<ClubTask>()
                .HasOne(t => t.Creator)
                .WithMany()
                .HasForeignKey(t => t.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull);
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var currentUserId = _httpContextAccessor?.HttpContext?.User
                .FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

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

                if (entry.Entity is ISoftDeletable softDeletable
                    && entry.State == EntityState.Deleted)
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

            return base.SaveChangesAsync(cancellationToken);
        }
    }
}
