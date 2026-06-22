using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddClubPipelineStages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CurrentStageId",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ClubPipelineStages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ClubId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    StageOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClubPipelineStages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClubPipelineStages_Clubs_ClubId",
                        column: x => x.ClubId,
                        principalTable: "Clubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Applications_CurrentStageId",
                table: "Applications",
                column: "CurrentStageId");

            migrationBuilder.CreateIndex(
                name: "IX_ClubPipelineStages_ClubId",
                table: "ClubPipelineStages",
                column: "ClubId");

            migrationBuilder.AddForeignKey(
                name: "FK_Applications_ClubPipelineStages_CurrentStageId",
                table: "Applications",
                column: "CurrentStageId",
                principalTable: "ClubPipelineStages",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Applications_ClubPipelineStages_CurrentStageId",
                table: "Applications");

            migrationBuilder.DropTable(
                name: "ClubPipelineStages");

            migrationBuilder.DropIndex(
                name: "IX_Applications_CurrentStageId",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "CurrentStageId",
                table: "Applications");
        }
    }
}
