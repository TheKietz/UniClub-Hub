using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Shared.Data
{
    public class UniClubDbContext : IdentityDbContext<ApplicationUser>
    {
        public UniClubDbContext(DbContextOptions<UniClubDbContext> options)
            : base(options) { }

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
        public DbSet<TaskComment> TaskComments { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // JSONB columns (PostgreSQL)
            builder.Entity<Club>().Property(c => c.FormSchema).HasColumnType("jsonb");

            builder.Entity<LandingPage>().Property(lp => lp.SocialLinks).HasColumnType("jsonb");

            builder.Entity<LandingPage>().Property(lp => lp.LayoutSettings).HasColumnType("jsonb");

            builder.Entity<ClubApplication>().Property(a => a.Answers).HasColumnType("jsonb");

            // Club.Code phải unique
            builder.Entity<Club>().HasIndex(c => c.Code).IsUnique();

            // LandingPage — quan hệ 1-1 với Club
            builder
                .Entity<LandingPage>()
                .HasOne(lp => lp.Club)
                .WithOne(c => c.LandingPage)
                .HasForeignKey<LandingPage>(lp => lp.ClubId);

            // ClubTask có 2 FK vào ApplicationUser — phải khai báo tường minh
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
        }
    }
}
