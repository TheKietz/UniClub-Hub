using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddClubPositions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskAssignees_TaskId",
                table: "TaskAssignees");

            migrationBuilder.CreateTable(
                name: "ClubPositions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ClubId = table.Column<int>(type: "integer", nullable: false),
                    DepartmentId = table.Column<int>(type: "integer", nullable: true),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CanBeAssignedByDeptLead = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClubPositions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClubPositions_Clubs_ClubId",
                        column: x => x.ClubId,
                        principalTable: "Clubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClubPositions_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ClubMemberPositions",
                columns: table => new
                {
                    MembershipId = table.Column<int>(type: "integer", nullable: false),
                    PositionId = table.Column<int>(type: "integer", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    AssignedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClubMemberPositions", x => new { x.MembershipId, x.PositionId });
                    table.ForeignKey(
                        name: "FK_ClubMemberPositions_ClubMemberships_MembershipId",
                        column: x => x.MembershipId,
                        principalTable: "ClubMemberships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClubMemberPositions_ClubPositions_PositionId",
                        column: x => x.PositionId,
                        principalTable: "ClubPositions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ClubPositionPermissions",
                columns: table => new
                {
                    PositionId = table.Column<int>(type: "integer", nullable: false),
                    PermissionCode = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClubPositionPermissions", x => new { x.PositionId, x.PermissionCode });
                    table.ForeignKey(
                        name: "FK_ClubPositionPermissions_ClubPositions_PositionId",
                        column: x => x.PositionId,
                        principalTable: "ClubPositions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignees_TaskId_UserId",
                table: "TaskAssignees",
                columns: new[] { "TaskId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClubMemberPositions_PositionId",
                table: "ClubMemberPositions",
                column: "PositionId");

            migrationBuilder.CreateIndex(
                name: "IX_ClubPositions_ClubId_DepartmentId_Name",
                table: "ClubPositions",
                columns: new[] { "ClubId", "DepartmentId", "Name" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_ClubPositions_DepartmentId",
                table: "ClubPositions",
                column: "DepartmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClubMemberPositions");

            migrationBuilder.DropTable(
                name: "ClubPositionPermissions");

            migrationBuilder.DropTable(
                name: "ClubPositions");

            migrationBuilder.DropIndex(
                name: "IX_TaskAssignees_TaskId_UserId",
                table: "TaskAssignees");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignees_TaskId",
                table: "TaskAssignees",
                column: "TaskId");
        }
    }
}
