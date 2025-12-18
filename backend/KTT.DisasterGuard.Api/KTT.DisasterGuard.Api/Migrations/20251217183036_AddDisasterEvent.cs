using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KTT.DisasterGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDisasterEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DisasterEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CenterLat = table.Column<double>(type: "float", nullable: false),
                    CenterLng = table.Column<double>(type: "float", nullable: false),
                    RadiusMeters = table.Column<int>(type: "int", nullable: false),
                    PolygonGeoJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DisasterEvents", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DisasterEvents");
        }
    }
}
