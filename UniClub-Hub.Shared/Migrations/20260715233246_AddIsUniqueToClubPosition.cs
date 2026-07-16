using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddIsUniqueToClubPosition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsUnique",
                table: "ClubPositions",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsUnique",
                table: "ClubPositions");
        }
    }
}
