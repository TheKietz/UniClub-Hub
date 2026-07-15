using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddXminConcurrencyToClubApplication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // No-op: "xmin" là cột hệ thống có sẵn trên mọi bảng PostgreSQL — không tạo/xóa được
            // bằng ALTER TABLE. Migration này chỉ để đồng bộ model snapshot của EF Core, không có
            // thay đổi schema thật nào cần áp dụng.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
