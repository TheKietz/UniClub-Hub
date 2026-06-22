using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentIdToSprintv2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "Sprints",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sprints_DepartmentId",
                table: "Sprints",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Sprints_Departments_DepartmentId",
                table: "Sprints",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sprints_Departments_DepartmentId",
                table: "Sprints");

            migrationBuilder.DropIndex(
                name: "IX_Sprints_DepartmentId",
                table: "Sprints");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "Sprints");
        }
    }
}
