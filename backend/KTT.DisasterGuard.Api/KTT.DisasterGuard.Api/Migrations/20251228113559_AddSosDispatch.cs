using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KTT.DisasterGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSosDispatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "SosRequests",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<DateTime>(
                name: "AcceptedAt",
                table: "SosRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "SosRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RescuedAt",
                table: "SosRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RescuerId",
                table: "SosRequests",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "SosRequests",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_SosRequests_RescuerId",
                table: "SosRequests",
                column: "RescuerId");

            migrationBuilder.CreateIndex(
                name: "IX_SosRequests_Status",
                table: "SosRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_UserId",
                table: "Locations",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SosRequests_RescuerId",
                table: "SosRequests");

            migrationBuilder.DropIndex(
                name: "IX_SosRequests_Status",
                table: "SosRequests");

            migrationBuilder.DropIndex(
                name: "IX_Locations_UserId",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "AcceptedAt",
                table: "SosRequests");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "SosRequests");

            migrationBuilder.DropColumn(
                name: "RescuedAt",
                table: "SosRequests");

            migrationBuilder.DropColumn(
                name: "RescuerId",
                table: "SosRequests");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "SosRequests");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "SosRequests",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);
        }
    }
}
