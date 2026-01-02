using System.Security.Claims;
using System.Text;
using KTT.DisasterGuard.Api.Data;
using KTT.DisasterGuard.Api.Hubs;
using KTT.DisasterGuard.Api.Models;
using KTT.DisasterGuard.Api.Services;
using KTT.DisasterGuard.Api.Services.Cyclone;
using KTT.DisasterGuard.Api.Services.Atcf; // ✅ ATCF (JTWC/NHC) a/b-deck
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// =======================
// Controllers + Swagger
// =======================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "DisasterGuard API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập: Bearer {token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// =======================
// SignalR
// =======================
builder.Services.AddSignalR();

// =======================
// CORS (Vite + SignalR)
// =======================
const string CorsPolicy = "AllowVite";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173",
                "http://127.0.0.1:5173",
                "https://127.0.0.1:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            // SignalR cross-origin (negotiate/websocket) -> cần credentials
            .AllowCredentials();
    });
});

// =======================
// DB
// =======================
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default"));
});

// =======================
// JWT Auth
// =======================
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

var jwtKey = builder.Configuration["Jwt:Key"]!;
var issuer = builder.Configuration["Jwt:Issuer"]!;
var audience = builder.Configuration["Jwt:Audience"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,

            ValidIssuer = issuer,
            ValidAudience = audience,

            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero,

            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role
        };

        // ✅ SignalR: lấy token từ query ?access_token=... khi connect hub
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs/realtime"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// =======================
// Cyclone Sources
// =======================

// ✅ (A) JMA Bosai Cyclone Track (real data)
builder.Services.AddHttpClient<ICycloneTrackService, JmaBosaiCycloneTrackService>();

// ✅ Typed HttpClient for JMA Bosai
builder.Services.AddHttpClient<JmaTyphoonService>(client =>
{
    client.BaseAddress = new Uri("https://www.jma.go.jp/bosai/");
    client.DefaultRequestHeaders.UserAgent.ParseAdd("KTT.DisasterGuard/1.0");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
});

// ✅ (B) ATCF JTWC/NHC a-deck / b-deck
// (Bạn cần có AtcfOptions + IAtcfService/AtcfService theo code mình gửi)
builder.Services.AddMemoryCache();
builder.Services.Configure<AtcfOptions>(builder.Configuration.GetSection("Atcf"));
builder.Services.AddHttpClient<IAtcfService, AtcfService>();

// =======================
// Build App
// =======================
var app = builder.Build();

// =======================
// Dev: migrate + seed
// =======================
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.MigrateAsync();

    var adminEmail = (builder.Configuration["SeedUsers:AdminEmail"] ?? "admin@ktt.com").ToLowerInvariant();
    var adminPass = builder.Configuration["SeedUsers:AdminPassword"] ?? "Admin@12345";

    var rescueEmail = (builder.Configuration["SeedUsers:RescueEmail"] ?? "rescue@ktt.com").ToLowerInvariant();
    var rescuePass = builder.Configuration["SeedUsers:RescuePassword"] ?? "Rescue@12345";

    async Task EnsureUser(string email, string password, string role, string fullName)
    {
        if (await db.Users.AnyAsync(x => x.Email == email)) return;

        db.Users.Add(new User
        {
            FullName = fullName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role
        });

        await db.SaveChangesAsync();
    }

    await EnsureUser(adminEmail, adminPass, "ADMIN", "KTT Admin");
    await EnsureUser(rescueEmail, rescuePass, "RESCUE", "KTT Rescue");
}

// =======================
// Middlewares
// =======================
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "DisasterGuard API v1");
});

app.UseHttpsRedirection();

// ✅ CORS trước auth
app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

// =======================
// Map endpoints
// =======================
app.MapControllers();

// ✅ SignalR Hub
app.MapHub<RealtimeHub>("/hubs/realtime")
   .RequireCors(CorsPolicy);

app.Run();
