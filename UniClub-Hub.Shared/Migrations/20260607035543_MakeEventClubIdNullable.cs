using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class MakeEventClubIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "ClubId",
                table: "Events",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "ClubId1",
                table: "Events",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Events_ClubId1",
                table: "Events",
                column: "ClubId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Events_Clubs_ClubId1",
                table: "Events",
                column: "ClubId1",
                principalTable: "Clubs",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Events_Clubs_ClubId1",
                table: "Events");

            migrationBuilder.DropIndex(
                name: "IX_Events_ClubId1",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "ClubId1",
                table: "Events");

            migrationBuilder.AlterColumn<int>(
                name: "ClubId",
                table: "Events",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
