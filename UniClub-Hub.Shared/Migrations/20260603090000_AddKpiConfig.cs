using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using UniClub_Hub.Shared.Data;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(UniClubDbContext))]
    [Migration("20260603090000_AddKpiConfig")]
    public partial class AddKpiConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KpiConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ClubId = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamptz", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiConfigs_Clubs_ClubId",
                        column: x => x.ClubId,
                        principalTable: "Clubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KpiCriteria",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    KpiConfigId = table.Column<int>(type: "integer", nullable: false),
                    MetricKey = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValue: "TaskCompletion"),
                    DisplayName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Weight = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiCriteria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiCriteria_KpiConfigs_KpiConfigId",
                        column: x => x.KpiConfigId,
                        principalTable: "KpiConfigs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KpiConfigs_ClubId",
                table: "KpiConfigs",
                column: "ClubId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KpiCriteria_KpiConfigId_MetricKey",
                table: "KpiCriteria",
                columns: new[] { "KpiConfigId", "MetricKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "KpiCriteria");
            migrationBuilder.DropTable(name: "KpiConfigs");
        }
    }
}
