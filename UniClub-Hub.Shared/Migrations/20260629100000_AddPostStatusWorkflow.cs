using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using UniClub_Hub.Shared.Data;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    [DbContext(typeof(UniClubDbContext))]
    [Migration("20260629100000_AddPostStatusWorkflow")]
    public partial class AddPostStatusWorkflow : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add Status column, migrate IsPublished → Status
            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Posts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Migrate: IsPublished = true → Published (2), false → Draft (0)
            migrationBuilder.Sql("UPDATE \"Posts\" SET \"Status\" = 2 WHERE \"IsPublished\" = true");

            // Drop old IsPublished column
            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "Posts");

            // Add review fields
            migrationBuilder.AddColumn<string>(
                name: "ReviewNote",
                table: "Posts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewerId",
                table: "Posts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "Posts",
                type: "timestamp with time zone",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ReviewNote", table: "Posts");
            migrationBuilder.DropColumn(name: "ReviewerId", table: "Posts");
            migrationBuilder.DropColumn(name: "ReviewedAt", table: "Posts");

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "Posts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("UPDATE \"Posts\" SET \"IsPublished\" = true WHERE \"Status\" = 2");

            migrationBuilder.DropColumn(name: "Status", table: "Posts");
        }
    }
}
