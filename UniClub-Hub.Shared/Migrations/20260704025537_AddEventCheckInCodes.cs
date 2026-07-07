using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddEventCheckInCodes : Migration
    {
        // No-op. Recreated to match a migration applied on the Neon dev DB but never
        // committed to source, so the migration history is self-describing and EF marks
        // this ID as already-applied on Neon (no re-run).
        // The EventCheckInCodes table that this ID created on Neon is now modeled properly
        // (entity + DbSet) and created for fresh databases by the later, idempotent
        // 20260706110618_AdoptEventCheckInCodesTable migration.

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
