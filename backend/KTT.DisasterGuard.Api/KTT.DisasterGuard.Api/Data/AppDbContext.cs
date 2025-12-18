using KTT.DisasterGuard.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace KTT.DisasterGuard.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<SosRequest> SosRequests => Set<SosRequest>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<DisasterEvent> DisasterEvents => Set<DisasterEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(x => x.Email)
            .IsUnique();
    }
}
