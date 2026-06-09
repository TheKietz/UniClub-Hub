using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using UniClub_Hub.Shared.Data;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(UniClubDbContext))]
    [Migration("20260603091000_AddKpiGradeConfig")]
    public partial class AddKpiGradeConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KpiGradeConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    KpiConfigId = table.Column<int>(type: "integer", nullable: false),
                    Label = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MinScore = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiGradeConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiGradeConfigs_KpiConfigs_KpiConfigId",
                        column: x => x.KpiConfigId,
                        principalTable: "KpiConfigs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KpiGradeConfigs_KpiConfigId_MinScore",
                table: "KpiGradeConfigs",
                columns: new[] { "KpiConfigId", "MinScore" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "KpiGradeConfigs");
        }
    }
}
