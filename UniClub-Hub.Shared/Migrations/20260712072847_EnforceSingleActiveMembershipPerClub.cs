using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class EnforceSingleActiveMembershipPerClub : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Dọn dữ liệu cũ trước khi tạo unique index: nếu 1 user có nhiều dòng membership
            // đang hoạt động trong cùng CLB, giữ lại dòng "tốt nhất" (role cao nhất:
            // CLUB_ADMIN > DEPT_LEAD > MEMBER, ưu tiên Active hơn Probation, rồi dòng mới nhất)
            // và chuyển các dòng còn lại sang Resigned để giữ lịch sử.
            // Enum lưu dạng chuỗi (ClubMembershipConfiguration) nên so sánh bằng chuỗi.
            migrationBuilder.Sql("""
                WITH ranked AS (
                    SELECT "Id", ROW_NUMBER() OVER (
                        PARTITION BY "ClubId", "UserId"
                        ORDER BY
                            (CASE "ClubRole" WHEN 'CLUB_ADMIN' THEN 0 WHEN 'DEPT_LEAD' THEN 1 ELSE 2 END),
                            (CASE "Status" WHEN 'Active' THEN 0 ELSE 1 END),
                            "JoinedDate" DESC,
                            "Id" DESC
                    ) AS rn
                    FROM "ClubMemberships"
                    WHERE "Status" IN ('Active', 'Probation')
                )
                UPDATE "ClubMemberships" m
                SET "Status" = 'Resigned', "ResignedDate" = CURRENT_DATE
                FROM ranked r
                WHERE m."Id" = r."Id" AND r.rn > 1;
                """);

            migrationBuilder.DropIndex(
                name: "IX_ClubMemberships_ClubId",
                table: "ClubMemberships");

            migrationBuilder.CreateIndex(
                name: "IX_ClubMemberships_ClubId_UserId",
                table: "ClubMemberships",
                columns: new[] { "ClubId", "UserId" },
                unique: true,
                filter: "\"Status\" IN ('Active', 'Probation')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ClubMemberships_ClubId_UserId",
                table: "ClubMemberships");

            migrationBuilder.CreateIndex(
                name: "IX_ClubMemberships_ClubId",
                table: "ClubMemberships",
                column: "ClubId");
        }
    }
}
