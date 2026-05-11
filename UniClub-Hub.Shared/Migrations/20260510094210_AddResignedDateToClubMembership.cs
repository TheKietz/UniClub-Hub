using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddResignedDateToClubMembership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "ResignedDate",
                table: "ClubMemberships",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResignedDate",
                table: "ClubMemberships");
        }
    }
}
