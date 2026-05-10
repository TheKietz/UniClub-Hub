using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace UniClub_Hub.Shared.Migrations
{
    /// <inheritdoc />
    public partial class Alter_AuditLogs_To_Jsonb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE \"AuditLogs\" ALTER COLUMN \"OldValue\" TYPE jsonb USING \"OldValue\"::jsonb;"
            );
            migrationBuilder.Sql(
                "ALTER TABLE \"AuditLogs\" ALTER COLUMN \"NewValue\" TYPE jsonb USING \"NewValue\"::jsonb;"
            );
            migrationBuilder.DropIndex(name: "IX_Tasks_ClubId", table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_EventRegistrations_EventId",
                table: "EventRegistrations"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Tasks",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Todo",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Priority",
                table: "Tasks",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Medium",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "Deadline",
                table: "Tasks",
                type: "timestamptz",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true
            );

            migrationBuilder.AddColumn<float>(
                name: "ActualHours",
                table: "Tasks",
                type: "real",
                nullable: true
            );

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CompletedAt",
                table: "Tasks",
                type: "timestamp with time zone",
                nullable: true
            );

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Tasks",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified)
            );

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "Tasks",
                type: "text",
                nullable: true
            );

            migrationBuilder.AddColumn<float>(
                name: "EstimatedHours",
                table: "Tasks",
                type: "real",
                nullable: true
            );

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Tasks",
                type: "boolean",
                nullable: false,
                defaultValue: false
            );

            migrationBuilder.AddColumn<int>(
                name: "ParentId",
                table: "Tasks",
                type: "integer",
                nullable: true
            );

            migrationBuilder.AddColumn<int>(
                name: "SprintId",
                table: "Tasks",
                type: "integer",
                nullable: true
            );

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Tasks",
                type: "timestamptz",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "Tasks",
                type: "text",
                nullable: true
            );

            migrationBuilder.AddColumn<bool>(
                name: "IsEdited",
                table: "TaskComments",
                type: "boolean",
                nullable: false,
                defaultValue: false
            );

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "TaskComments",
                type: "timestamp with time zone",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "ContentType",
                table: "TaskAttachments",
                type: "text",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "TaskAttachments",
                type: "text",
                nullable: true
            );

            migrationBuilder.AddColumn<long>(
                name: "FileSize",
                table: "TaskAttachments",
                type: "bigint",
                nullable: true
            );

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "TaskAttachments",
                type: "boolean",
                nullable: false,
                defaultValue: false
            );

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Posts",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Posts",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "Posts",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "News",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Notifications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "System",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Notifications",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Notifications",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone"
            );

            migrationBuilder.AlterColumn<string>(
                name: "MediaType",
                table: "MediaGalleries",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Image",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Events",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Draft",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "StartTime",
                table: "Events",
                type: "timestamptz",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Events",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "EndTime",
                table: "Events",
                type: "timestamptz",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "BannerUrl",
                table: "Events",
                type: "text",
                nullable: true
            );

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Events",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified)
            );

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "Events",
                type: "text",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "Events",
                type: "text",
                nullable: true
            );

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Events",
                type: "boolean",
                nullable: false,
                defaultValue: false
            );

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Events",
                type: "timestamptz",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "Events",
                type: "text",
                nullable: true
            );

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "RegisteredAt",
                table: "EventRegistrations",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Attendance",
                table: "EventRegistrations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Pending",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CheckedInAt",
                table: "EventRegistrations",
                type: "timestamptz",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "EventRegistrations",
                type: "text",
                nullable: true
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Departments",
                type: "timestamptz",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Departments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Departments",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone"
            );

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "RecordedAt",
                table: "Contributions",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone"
            );

            migrationBuilder.AlterColumn<string>(
                name: "ActivityType",
                table: "Contributions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Contributions",
                type: "text",
                nullable: true
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Clubs",
                type: "timestamptz",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Clubs",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Clubs",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Clubs",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Clubs",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "AdvisorName",
                table: "Clubs",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ClubMemberships",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "ClubRole",
                table: "ClubMemberships",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "MEMBER",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "Timestamp",
                table: "AuditLogs",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone"
            );

            migrationBuilder.AlterColumn<string>(
                name: "OldValue",
                table: "AuditLogs",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "NewValue",
                table: "AuditLogs",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "EntityName",
                table: "AuditLogs",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "EntityId",
                table: "AuditLogs",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Action",
                table: "AuditLogs",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Applications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Pending",
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "AppliedAt",
                table: "Applications",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone"
            );

            migrationBuilder.CreateTable(
                name: "Sprints",
                columns: table => new
                {
                    Id = table
                        .Column<int>(type: "integer", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    ClubId = table.Column<int>(type: "integer", nullable: false),
                    EventId = table.Column<int>(type: "integer", nullable: true),
                    Name = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false
                    ),
                    Goal = table.Column<string>(type: "text", nullable: true),
                    StartDate = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    EndDate = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    Status = table.Column<string>(
                        type: "character varying(20)",
                        maxLength: 20,
                        nullable: false,
                        defaultValue: "Planning"
                    ),
                    ReviewNotes = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamptz", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedBy = table.Column<string>(type: "text", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sprints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sprints_Clubs_ClubId",
                        column: x => x.ClubId,
                        principalTable: "Clubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                    table.ForeignKey(
                        name: "FK_Sprints_Events_EventId",
                        column: x => x.EventId,
                        principalTable: "Events",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull
                    );
                }
            );

            migrationBuilder.CreateTable(
                name: "TaskDependencies",
                columns: table => new
                {
                    TaskId = table.Column<int>(type: "integer", nullable: false),
                    DependsOnTaskId = table.Column<int>(type: "integer", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_TaskDependencies",
                        x => new { x.TaskId, x.DependsOnTaskId }
                    );
                    table.ForeignKey(
                        name: "FK_TaskDependencies_Tasks_DependsOnTaskId",
                        column: x => x.DependsOnTaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict
                    );
                    table.ForeignKey(
                        name: "FK_TaskDependencies_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ClubId_Status",
                table: "Tasks",
                columns: new[] { "ClubId", "Status" }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ParentId",
                table: "Tasks",
                column: "ParentId"
            );

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_SprintId",
                table: "Tasks",
                column: "SprintId"
            );

            migrationBuilder.CreateIndex(
                name: "IX_EventRegistrations_EventId_UserId",
                table: "EventRegistrations",
                columns: new[] { "EventId", "UserId" },
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "IX_Sprints_ClubId_Status",
                table: "Sprints",
                columns: new[] { "ClubId", "Status" }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Sprints_EventId",
                table: "Sprints",
                column: "EventId"
            );

            migrationBuilder.CreateIndex(
                name: "IX_TaskDependencies_DependsOnTaskId",
                table: "TaskDependencies",
                column: "DependsOnTaskId"
            );

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Sprints_SprintId",
                table: "Tasks",
                column: "SprintId",
                principalTable: "Sprints",
                principalColumn: "Id"
            );

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Tasks_ParentId",
                table: "Tasks",
                column: "ParentId",
                principalTable: "Tasks",
                principalColumn: "Id"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_Tasks_Sprints_SprintId", table: "Tasks");

            migrationBuilder.DropForeignKey(name: "FK_Tasks_Tasks_ParentId", table: "Tasks");

            migrationBuilder.DropTable(name: "Sprints");

            migrationBuilder.DropTable(name: "TaskDependencies");

            migrationBuilder.DropIndex(name: "IX_Tasks_ClubId_Status", table: "Tasks");

            migrationBuilder.DropIndex(name: "IX_Tasks_ParentId", table: "Tasks");

            migrationBuilder.DropIndex(name: "IX_Tasks_SprintId", table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_EventRegistrations_EventId_UserId",
                table: "EventRegistrations"
            );

            migrationBuilder.DropColumn(name: "ActualHours", table: "Tasks");

            migrationBuilder.DropColumn(name: "CompletedAt", table: "Tasks");

            migrationBuilder.DropColumn(name: "CreatedAt", table: "Tasks");

            migrationBuilder.DropColumn(name: "DeletedBy", table: "Tasks");

            migrationBuilder.DropColumn(name: "EstimatedHours", table: "Tasks");

            migrationBuilder.DropColumn(name: "IsDeleted", table: "Tasks");

            migrationBuilder.DropColumn(name: "ParentId", table: "Tasks");

            migrationBuilder.DropColumn(name: "SprintId", table: "Tasks");

            migrationBuilder.DropColumn(name: "UpdatedAt", table: "Tasks");

            migrationBuilder.DropColumn(name: "UpdatedBy", table: "Tasks");

            migrationBuilder.DropColumn(name: "IsEdited", table: "TaskComments");

            migrationBuilder.DropColumn(name: "UpdatedAt", table: "TaskComments");

            migrationBuilder.DropColumn(name: "ContentType", table: "TaskAttachments");

            migrationBuilder.DropColumn(name: "DeletedBy", table: "TaskAttachments");

            migrationBuilder.DropColumn(name: "FileSize", table: "TaskAttachments");

            migrationBuilder.DropColumn(name: "IsDeleted", table: "TaskAttachments");

            migrationBuilder.DropColumn(name: "BannerUrl", table: "Events");

            migrationBuilder.DropColumn(name: "CreatedAt", table: "Events");

            migrationBuilder.DropColumn(name: "CreatedBy", table: "Events");

            migrationBuilder.DropColumn(name: "DeletedBy", table: "Events");

            migrationBuilder.DropColumn(name: "IsDeleted", table: "Events");

            migrationBuilder.DropColumn(name: "UpdatedAt", table: "Events");

            migrationBuilder.DropColumn(name: "UpdatedBy", table: "Events");

            migrationBuilder.DropColumn(name: "CheckedInAt", table: "EventRegistrations");

            migrationBuilder.DropColumn(name: "Note", table: "EventRegistrations");

            migrationBuilder.DropColumn(name: "Note", table: "Contributions");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Tasks",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Todo"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Priority",
                table: "Tasks",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Medium"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "Deadline",
                table: "Tasks",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Posts",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(300)",
                oldMaxLength: 300
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Posts",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "Posts",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldDefaultValue: "News"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Notifications",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "System"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Notifications",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Notifications",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz"
            );

            migrationBuilder.AlterColumn<string>(
                name: "MediaType",
                table: "MediaGalleries",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Image"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Events",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Draft"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "StartTime",
                table: "Events",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Events",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "EndTime",
                table: "Events",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "RegisteredAt",
                table: "EventRegistrations",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Attendance",
                table: "EventRegistrations",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Pending"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Departments",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Departments",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Departments",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "RecordedAt",
                table: "Contributions",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz"
            );

            migrationBuilder.AlterColumn<string>(
                name: "ActivityType",
                table: "Contributions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Clubs",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Clubs",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Active"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Clubs",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(150)",
                oldMaxLength: 150
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Clubs",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz"
            );

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Clubs",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30
            );

            migrationBuilder.AlterColumn<string>(
                name: "AdvisorName",
                table: "Clubs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(150)",
                oldMaxLength: 150,
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ClubMemberships",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Active"
            );

            migrationBuilder.AlterColumn<string>(
                name: "ClubRole",
                table: "ClubMemberships",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "MEMBER"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "Timestamp",
                table: "AuditLogs",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz"
            );

            migrationBuilder.AlterColumn<string>(
                name: "OldValue",
                table: "AuditLogs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "NewValue",
                table: "AuditLogs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "EntityName",
                table: "AuditLogs",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100
            );

            migrationBuilder.AlterColumn<string>(
                name: "EntityId",
                table: "AuditLogs",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100
            );

            migrationBuilder.AlterColumn<string>(
                name: "Action",
                table: "AuditLogs",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20
            );

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Applications",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Pending"
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "AppliedAt",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz"
            );

            migrationBuilder.CreateIndex(name: "IX_Tasks_ClubId", table: "Tasks", column: "ClubId");

            migrationBuilder.CreateIndex(
                name: "IX_EventRegistrations_EventId",
                table: "EventRegistrations",
                column: "EventId"
            );
        }
    }
}
