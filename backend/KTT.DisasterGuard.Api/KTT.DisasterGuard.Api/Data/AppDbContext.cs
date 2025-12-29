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
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(x => x.Email)
            .IsUnique();

        modelBuilder.Entity<SosRequest>().HasIndex(x => x.Status);
        modelBuilder.Entity<SosRequest>().HasIndex(x => x.RescuerId);

        modelBuilder.Entity<Location>().HasIndex(x => x.UserId).IsUnique();
    }
}
