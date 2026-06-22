using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentIdToKanbanColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "KanbanColumns",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_KanbanColumns_DepartmentId",
                table: "KanbanColumns",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_KanbanColumns_Departments_DepartmentId",
                table: "KanbanColumns",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_KanbanColumns_Departments_DepartmentId",
                table: "KanbanColumns");

            migrationBuilder.DropIndex(
                name: "IX_KanbanColumns_DepartmentId",
                table: "KanbanColumns");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "KanbanColumns");
        }
    }
}
