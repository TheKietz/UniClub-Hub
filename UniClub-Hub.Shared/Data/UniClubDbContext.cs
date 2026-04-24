using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using UniClub_Hub.Shared.Models;
namespace UniClub_Hub.Shared.Data
{
    public class UniClubDbContext : IdentityDbContext<ApplicationUser>
    {
        public UniClubDbContext(DbContextOptions<UniClubDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
        }

        public DbSet<Club> Clubs { get; set; }
    }
}
