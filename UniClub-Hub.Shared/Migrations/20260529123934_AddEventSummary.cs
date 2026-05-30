using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddEventSummary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskAssignees_TaskId",
                table: "TaskAssignees");

            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "Events",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignees_TaskId_UserId",
                table: "TaskAssignees",
                columns: new[] { "TaskId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskAssignees_TaskId_UserId",
                table: "TaskAssignees");

            migrationBuilder.DropColumn(
                name: "Summary",
                table: "Events");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignees_TaskId",
                table: "TaskAssignees",
                column: "TaskId");
        }
    }
}
