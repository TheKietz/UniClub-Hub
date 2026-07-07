using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaGalleryApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "ReviewedAt",
                table: "Posts",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewNote",
                table: "MediaGalleries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "MediaGalleries",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewerId",
                table: "MediaGalleries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "MediaGalleries",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UploadedAt",
                table: "MediaGalleries",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "UploadedById",
                table: "MediaGalleries",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MediaGalleries_ReviewerId",
                table: "MediaGalleries",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaGalleries_UploadedById",
                table: "MediaGalleries",
                column: "UploadedById");

            migrationBuilder.AddForeignKey(
                name: "FK_MediaGalleries_AspNetUsers_ReviewerId",
                table: "MediaGalleries",
                column: "ReviewerId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MediaGalleries_AspNetUsers_UploadedById",
                table: "MediaGalleries",
                column: "UploadedById",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MediaGalleries_AspNetUsers_ReviewerId",
                table: "MediaGalleries");

            migrationBuilder.DropForeignKey(
                name: "FK_MediaGalleries_AspNetUsers_UploadedById",
                table: "MediaGalleries");

            migrationBuilder.DropIndex(
                name: "IX_MediaGalleries_ReviewerId",
                table: "MediaGalleries");

            migrationBuilder.DropIndex(
                name: "IX_MediaGalleries_UploadedById",
                table: "MediaGalleries");

            migrationBuilder.DropColumn(
                name: "ReviewNote",
                table: "MediaGalleries");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "MediaGalleries");

            migrationBuilder.DropColumn(
                name: "ReviewerId",
                table: "MediaGalleries");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "MediaGalleries");

            migrationBuilder.DropColumn(
                name: "UploadedAt",
                table: "MediaGalleries");

            migrationBuilder.DropColumn(
                name: "UploadedById",
                table: "MediaGalleries");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ReviewedAt",
                table: "Posts",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);
        }
    }
}
